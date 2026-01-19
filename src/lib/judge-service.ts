// lib/judge-service.ts
// Service for running AI judge evaluations on responses

import { prisma } from './db';
import { decrypt, EncryptionProvider, hasEncryptionKey } from './encryption';
import {
  JudgeEvaluation,
  buildTrailFinderJudgePrompt,
  buildTrailAnalysisJudgePrompt,
  buildImprovementPrompt,
  evaluateJudgeResult,
  JUDGE_THRESHOLDS,
} from './judge-prompts';

/**
 * Get the configured judge model client
 * Returns null if no judge model is configured
 */
async function getJudgeClient(): Promise<{
  provider: string;
  apiKey: string;
  model: string;
} | null> {
  // Find a provider configured as judge model
  const judgeConfig = await prisma.aIProviderConfig.findFirst({
    where: {
      isJudgeModel: true,
      isEnabled: true,
    },
  });

  if (!judgeConfig) {
    console.log('[judge-service] No judge model configured');
    return null;
  }

  // Check encryption key
  if (!hasEncryptionKey(judgeConfig.provider as EncryptionProvider)) {
    console.error(`[judge-service] No encryption key for judge provider: ${judgeConfig.provider}`);
    return null;
  }

  // Decrypt API key
  if (!judgeConfig.encryptedApiKey || !judgeConfig.keyIv || !judgeConfig.keyAuthTag) {
    console.error('[judge-service] Judge model has no API key configured');
    return null;
  }

  try {
    const apiKey = decrypt(
      {
        ciphertext: judgeConfig.encryptedApiKey,
        iv: judgeConfig.keyIv,
        authTag: judgeConfig.keyAuthTag,
      },
      judgeConfig.provider as EncryptionProvider
    );

    return {
      provider: judgeConfig.provider,
      apiKey,
      model: judgeConfig.defaultModel || getDefaultModel(judgeConfig.provider),
    };
  } catch (error) {
    console.error('[judge-service] Failed to decrypt judge API key:', error);
    return null;
  }
}

/**
 * Get default model for a provider
 */
function getDefaultModel(provider: string): string {
  const defaults: Record<string, string> = {
    anthropic: 'claude-sonnet-4-20250514',
    openai: 'gpt-4o',
    google: 'gemini-2.0-flash',
    xai: 'grok-3',
  };
  return defaults[provider] || 'gpt-4o';
}

/**
 * Call the judge model with a prompt
 */
async function callJudgeModel(
  judgeConfig: { provider: string; apiKey: string; model: string },
  prompt: string
): Promise<string> {
  const { provider, apiKey, model } = judgeConfig;

  console.log(`[judge-service] Calling ${provider} judge model: ${model}`);

  switch (provider) {
    case 'anthropic': {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });
      return response.content[0].type === 'text' ? response.content[0].text : '';
    }

    case 'openai': {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey });
      const response = await client.chat.completions.create({
        model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });
      return response.choices[0]?.message?.content || '';
    }

    case 'google': {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const client = new GoogleGenerativeAI(apiKey);
      const genModel = client.getGenerativeModel({ model });
      const result = await genModel.generateContent(prompt);
      return result.response.text();
    }

    default:
      throw new Error(`Unsupported judge provider: ${provider}`);
  }
}

/**
 * Parse judge response JSON
 */
function parseJudgeResponse(response: string): JudgeEvaluation {
  // Try to extract JSON from the response
  let jsonStr = response.trim();

  // Remove markdown code blocks if present
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  // Find JSON object
  const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    jsonStr = objectMatch[0];
  }

  const parsed = JSON.parse(jsonStr);

  // Validate and provide defaults
  return {
    passed: parsed.passed ?? false,
    overallScore: parsed.overallScore ?? 5,
    accuracy: {
      score: parsed.accuracy?.score ?? 5,
      issues: parsed.accuracy?.issues ?? [],
      unverifiedClaims: parsed.accuracy?.unverifiedClaims ?? [],
    },
    hallucination: {
      detected: parsed.hallucination?.detected ?? false,
      examples: parsed.hallucination?.examples ?? [],
      severity: parsed.hallucination?.severity ?? 'none',
    },
    completeness: {
      score: parsed.completeness?.score ?? 5,
      missingElements: parsed.completeness?.missingElements ?? [],
    },
    sourceQuality: {
      score: parsed.sourceQuality?.score ?? 5,
      issues: parsed.sourceQuality?.issues ?? [],
      unverifiableSources: parsed.sourceQuality?.unverifiableSources ?? [],
    },
    improvements: parsed.improvements ?? [],
    revisedResponse: parsed.revisedResponse,
  };
}

/**
 * Evaluate a trail finder response using the judge model
 */
export async function evaluateTrailFinderResponse(
  query: {
    location: string;
    searchRadius?: number;
    difficultyPref?: string;
    tripLength?: string;
    sceneryTypes?: string[];
  },
  aiResponse: string,
  options: {
    maxRetries?: number;
    autoImprove?: boolean;
  } = {}
): Promise<{
  evaluation: JudgeEvaluation;
  improvedResponse?: string;
  iterations: number;
}> {
  const { maxRetries = 2, autoImprove = true } = options;

  const judgeConfig = await getJudgeClient();
  if (!judgeConfig) {
    // No judge configured - return a pass with warning
    console.log('[judge-service] No judge model - skipping evaluation');
    return {
      evaluation: {
        passed: true,
        overallScore: 7,
        accuracy: { score: 7, issues: ['Judge model not configured'], unverifiedClaims: [] },
        hallucination: { detected: false, examples: [], severity: 'none' },
        completeness: { score: 7, missingElements: [] },
        sourceQuality: { score: 7, issues: [], unverifiableSources: [] },
        improvements: [],
      },
      iterations: 0,
    };
  }

  let currentResponse = aiResponse;
  let evaluation: JudgeEvaluation;
  let iterations = 0;

  // Evaluation loop
  do {
    iterations++;
    console.log(`[judge-service] Evaluation iteration ${iterations}`);

    // Build and run judge prompt
    const judgePrompt = buildTrailFinderJudgePrompt(query, currentResponse);
    const judgeResponse = await callJudgeModel(judgeConfig, judgePrompt);

    try {
      evaluation = parseJudgeResponse(judgeResponse);
    } catch (error) {
      console.error('[judge-service] Failed to parse judge response:', error);
      // Return a cautious evaluation on parse failure
      return {
        evaluation: {
          passed: false,
          overallScore: 5,
          accuracy: { score: 5, issues: ['Judge response parse error'], unverifiedClaims: [] },
          hallucination: { detected: false, examples: [], severity: 'none' },
          completeness: { score: 5, missingElements: [] },
          sourceQuality: { score: 5, issues: [], unverifiableSources: [] },
          improvements: ['Re-run evaluation'],
        },
        iterations,
      };
    }

    // Apply threshold evaluation
    const thresholdResult = evaluateJudgeResult(evaluation);
    evaluation.passed = thresholdResult.passed;

    console.log(`[judge-service] Evaluation result:`, {
      passed: evaluation.passed,
      score: evaluation.overallScore,
      hallucinationSeverity: evaluation.hallucination.severity,
    });

    // If passed or no auto-improve, exit
    if (evaluation.passed || !autoImprove) {
      break;
    }

    // If we have a revised response from the judge, use it
    if (evaluation.revisedResponse) {
      currentResponse = evaluation.revisedResponse;
      console.log('[judge-service] Using judge-provided revised response');
      continue;
    }

    // Check if we should try to improve
    if (iterations >= maxRetries) {
      console.log('[judge-service] Max retries reached');
      break;
    }

    // Request improvement (this would need the original prompt)
    // For now, we'll just return the evaluation
    console.log('[judge-service] Improvement would be requested here');
    break;

  } while (iterations < maxRetries + 1);

  return {
    evaluation,
    improvedResponse: currentResponse !== aiResponse ? currentResponse : undefined,
    iterations,
  };
}

/**
 * Evaluate a trail analysis response using the judge model
 */
export async function evaluateTrailAnalysisResponse(
  context: {
    trailName?: string;
    trailLocation?: string;
    vehicleInfo?: {
      make: string;
      model: string;
      year?: number;
    };
  },
  aiResponse: string
): Promise<{
  evaluation: JudgeEvaluation;
  iterations: number;
}> {
  const judgeConfig = await getJudgeClient();
  if (!judgeConfig) {
    console.log('[judge-service] No judge model - skipping evaluation');
    return {
      evaluation: {
        passed: true,
        overallScore: 7,
        accuracy: { score: 7, issues: ['Judge model not configured'], unverifiedClaims: [] },
        hallucination: { detected: false, examples: [], severity: 'none' },
        completeness: { score: 7, missingElements: [] },
        sourceQuality: { score: 7, issues: [], unverifiableSources: [] },
        improvements: [],
      },
      iterations: 0,
    };
  }

  const judgePrompt = buildTrailAnalysisJudgePrompt(context, aiResponse);
  const judgeResponse = await callJudgeModel(judgeConfig, judgePrompt);

  try {
    const evaluation = parseJudgeResponse(judgeResponse);
    const thresholdResult = evaluateJudgeResult(evaluation);
    evaluation.passed = thresholdResult.passed;

    return { evaluation, iterations: 1 };
  } catch (error) {
    console.error('[judge-service] Failed to parse judge response:', error);
    return {
      evaluation: {
        passed: false,
        overallScore: 5,
        accuracy: { score: 5, issues: ['Judge response parse error'], unverifiedClaims: [] },
        hallucination: { detected: false, examples: [], severity: 'none' },
        completeness: { score: 5, missingElements: [] },
        sourceQuality: { score: 5, issues: [], unverifiableSources: [] },
        improvements: ['Re-run evaluation'],
      },
      iterations: 1,
    };
  }
}

/**
 * Check if judge evaluation is enabled
 */
export async function isJudgeEnabled(): Promise<boolean> {
  const judgeConfig = await prisma.aIProviderConfig.findFirst({
    where: {
      isJudgeModel: true,
      isEnabled: true,
    },
  });
  return !!judgeConfig;
}

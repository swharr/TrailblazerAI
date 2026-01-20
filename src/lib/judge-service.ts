// lib/judge-service.ts
// Service for running AI judge evaluations on responses

import { prisma } from './db';
import { decrypt, EncryptionProvider, hasEncryptionKey } from './encryption';
import {
  JudgeEvaluation,
  buildTrailFinderJudgePrompt,
  buildTrailAnalysisJudgePrompt,
  evaluateJudgeResult,
} from './judge-prompts';
import { isPayiProxyEnabled, judgeViaPayiProxy, getPayiClient } from './payi-client';

/** Map provider names to Pay-i category format */
const PROVIDER_CATEGORIES: Record<string, string> = {
  anthropic: 'system.anthropic',
  openai: 'system.openai',
  google: 'system.google',
  xai: 'system.xai',
};

/** Map provider names to environment variable names */
const PROVIDER_ENV_VARS: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_AI_API_KEY',
  xai: 'XAI_API_KEY',
};

/**
 * Get the configured judge model client
 * Returns null if no judge model is configured
 * Falls back to environment variables if database key not available
 */
async function getJudgeClient(): Promise<{
  provider: string;
  apiKey: string;
  model: string;
} | null> {
  // Find a provider configured as judge model
  // Note: isJudgeModel is sufficient - provider doesn't need to be "enabled" for general use
  const judgeConfig = await prisma.aIProviderConfig.findFirst({
    where: {
      isJudgeModel: true,
    },
  });

  if (!judgeConfig) {
    console.log('[judge-service] No judge model configured in database');
    return null;
  }

  const provider = judgeConfig.provider;
  const model = judgeConfig.defaultModel || getDefaultModel(provider);

  // Try to get API key from database first
  if (judgeConfig.encryptedApiKey && judgeConfig.keyIv && judgeConfig.keyAuthTag) {
    if (hasEncryptionKey(provider as EncryptionProvider)) {
      try {
        const apiKey = decrypt(
          {
            ciphertext: judgeConfig.encryptedApiKey,
            iv: judgeConfig.keyIv,
            authTag: judgeConfig.keyAuthTag,
          },
          provider as EncryptionProvider
        );
        console.log(`[judge-service] Using database API key for ${provider}`);
        return { provider, apiKey, model };
      } catch (error) {
        console.warn('[judge-service] Failed to decrypt database API key, trying env var fallback:', error);
      }
    }
  }

  // Fallback: Try environment variable
  const envVar = PROVIDER_ENV_VARS[provider];
  const envApiKey = envVar ? process.env[envVar] : undefined;

  if (envApiKey) {
    console.log(`[judge-service] Using environment variable ${envVar} for ${provider} judge model`);
    return { provider, apiKey: envApiKey, model };
  }

  console.error(`[judge-service] No API key found for judge provider ${provider} (checked database and ${envVar})`);
  return null;
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

/** Response from judge model call including usage */
interface JudgeModelResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Call the judge model with a prompt and track to Pay-i
 * Prefers using the Pay-i proxy for full instrumentation
 */
async function callJudgeModel(
  judgeConfig: { provider: string; apiKey: string; model: string },
  prompt: string,
  context?: { validatedUseCaseName?: string; location?: string }
): Promise<JudgeModelResponse> {
  const { provider, model } = judgeConfig;

  // Prefer using the proxy for full Pay-i instrumentation
  if (isPayiProxyEnabled()) {
    console.log(`[judge-service] Using Pay-i proxy for judge evaluation: ${provider}/${model}`);
    try {
      const proxyResponse = await judgeViaPayiProxy({
        prompt,
        provider,
        model,
        max_tokens: 4096,
        validated_use_case: context?.validatedUseCaseName,
        location: context?.location,
        use_case_name: 'judge_validation',
        use_case_version: 1,
        use_case_properties: {
          judge_provider: provider,
          judge_model: model,
          validated_use_case: context?.validatedUseCaseName || 'unknown',
          ...(context?.location && { location: context.location }),
        },
      });

      console.log(`[judge-service] Proxy response: ${proxyResponse.usage.input_tokens} input, ${proxyResponse.usage.output_tokens} output tokens`);

      return {
        text: proxyResponse.text,
        inputTokens: proxyResponse.usage.input_tokens,
        outputTokens: proxyResponse.usage.output_tokens,
      };
    } catch (proxyError) {
      console.error('[judge-service] Proxy call failed, falling back to direct call:', proxyError);
      // Fall through to direct API call
    }
  }

  // Fallback: Direct API call (no Pay-i proxy instrumentation)
  const { apiKey } = judgeConfig;
  console.log(`[judge-service] Direct call to ${provider} judge model: ${model}`);

  let text = '';
  let inputTokens = 0;
  let outputTokens = 0;

  switch (provider) {
    case 'anthropic': {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });
      text = response.content[0].type === 'text' ? response.content[0].text : '';
      inputTokens = response.usage.input_tokens;
      outputTokens = response.usage.output_tokens;
      break;
    }

    case 'openai': {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey });
      const response = await client.chat.completions.create({
        model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });
      text = response.choices[0]?.message?.content || '';
      inputTokens = response.usage?.prompt_tokens || 0;
      outputTokens = response.usage?.completion_tokens || 0;
      break;
    }

    case 'google': {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const client = new GoogleGenerativeAI(apiKey);
      const genModel = client.getGenerativeModel({ model });
      const result = await genModel.generateContent(prompt);
      text = result.response.text();
      // Google doesn't always provide token counts in the same way
      const usageMetadata = result.response.usageMetadata;
      inputTokens = usageMetadata?.promptTokenCount || 0;
      outputTokens = usageMetadata?.candidatesTokenCount || 0;
      break;
    }

    case 'xai': {
      // xAI Grok uses OpenAI-compatible API
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({
        apiKey,
        baseURL: 'https://api.x.ai/v1',
      });
      const response = await client.chat.completions.create({
        model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });
      text = response.choices[0]?.message?.content || '';
      inputTokens = response.usage?.prompt_tokens || 0;
      outputTokens = response.usage?.completion_tokens || 0;
      break;
    }

    default:
      throw new Error(`Unsupported judge provider: ${provider}`);
  }

  console.log(`[judge-service] Direct call complete: ${inputTokens} input, ${outputTokens} output tokens`);

  // Track to Pay-i via REST API (fallback when proxy not available)
  const payiClient = getPayiClient();
  if (payiClient.isEnabled()) {
    payiClient.ingest({
      category: PROVIDER_CATEGORIES[provider] || `system.${provider}`,
      resource: model,
      units: {
        text: {
          input: inputTokens,
          output: outputTokens,
        },
      },
      use_case_name: 'judge_validation',
      use_case_properties: {
        judge_provider: provider,
        judge_model: model,
        validated_use_case: context?.validatedUseCaseName || 'unknown',
        ...(context?.location && { location: context.location }),
      },
    }).then(() => {
      console.log(`[judge-service] Tracked to Pay-i via REST API: ${inputTokens} input, ${outputTokens} output tokens`);
    }).catch((err) => {
      console.error('[judge-service] Failed to track to Pay-i:', err);
    });
  }

  return { text, inputTokens, outputTokens };
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
    const judgeResponse = await callJudgeModel(judgeConfig, judgePrompt, {
      validatedUseCaseName: 'trail_finder',
      location: query.location,
    });

    try {
      evaluation = parseJudgeResponse(judgeResponse.text);
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
  const judgeResponse = await callJudgeModel(judgeConfig, judgePrompt, {
    validatedUseCaseName: 'trail_analysis',
    location: context.trailLocation,
  });

  try {
    const evaluation = parseJudgeResponse(judgeResponse.text);
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
 * Only requires isJudgeModel - provider doesn't need to be "enabled" for general use
 */
export async function isJudgeEnabled(): Promise<boolean> {
  const judgeConfig = await prisma.aIProviderConfig.findFirst({
    where: {
      isJudgeModel: true,
    },
  });
  return !!judgeConfig;
}

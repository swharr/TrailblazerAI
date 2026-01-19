// lib/judge-prompts.ts
// Prompts for AI judge/evaluator models to ensure accuracy and prevent hallucinations

/**
 * Judge evaluation result structure
 */
export interface JudgeEvaluation {
  passed: boolean;
  overallScore: number; // 1-10
  accuracy: {
    score: number; // 1-10
    issues: string[];
    unverifiedClaims: string[];
  };
  hallucination: {
    detected: boolean;
    examples: string[];
    severity: 'none' | 'minor' | 'moderate' | 'severe';
  };
  completeness: {
    score: number; // 1-10
    missingElements: string[];
  };
  sourceQuality: {
    score: number; // 1-10
    issues: string[];
    unverifiableSources: string[];
  };
  improvements: string[];
  revisedResponse?: string;
}

/**
 * Base judge system prompt - establishes the judge's role and standards
 */
export const JUDGE_SYSTEM_PROMPT = `You are a critical AI evaluator and fact-checker. Your role is to rigorously evaluate AI-generated responses for accuracy, detect hallucinations, and ensure information quality.

CORE PRINCIPLES:
1. SKEPTICISM FIRST: Assume claims are unverified until proven otherwise
2. SOURCE VERIFICATION: Real information has verifiable sources
3. SPECIFICITY CHECK: Vague claims often mask uncertainty or fabrication
4. CONSISTENCY CHECK: Contradictions indicate problems
5. PLAUSIBILITY CHECK: Does this match known reality?

HALLUCINATION INDICATORS:
- Overly specific details without sources (exact distances, dates, statistics)
- URLs that seem fabricated or don't follow real site patterns
- Trail/location names that don't appear in known databases
- Contradictory information within the same response
- Details that seem too convenient or perfectly match the query
- Claims about current conditions without recent verification
- Phone numbers, addresses, or contacts without verification

ACCURACY STANDARDS:
- Trail names must be verifiable on AllTrails, OnX, Gaia, or official sources
- Distances and elevations should be approximate unless sourced
- Permit requirements must reflect current regulations
- Difficulty ratings should be conservative (err on harder side)
- Seasonal recommendations should account for weather variability

Your evaluation must be thorough, specific, and actionable.`;

/**
 * Build a judge prompt for evaluating trail finder responses
 */
export function buildTrailFinderJudgePrompt(
  originalQuery: {
    location: string;
    searchRadius?: number;
    difficultyPref?: string;
    tripLength?: string;
    sceneryTypes?: string[];
  },
  aiResponse: string
): string {
  return `${JUDGE_SYSTEM_PROMPT}

--- EVALUATION TASK ---
Evaluate the following AI-generated trail recommendations for accuracy and hallucination.

--- ORIGINAL QUERY ---
Location: ${originalQuery.location}
Search Radius: ${originalQuery.searchRadius || 50} miles
Difficulty Preference: ${originalQuery.difficultyPref || 'any'}
Trip Length: ${originalQuery.tripLength || 'not specified'}
Scenery Types: ${originalQuery.sceneryTypes?.join(', ') || 'not specified'}

--- AI RESPONSE TO EVALUATE ---
${aiResponse}

--- EVALUATION CRITERIA ---

1. TRAIL EXISTENCE VERIFICATION
For each recommended trail, assess:
- Does this trail name appear to be real? (Check naming patterns)
- Is the location description plausible and specific?
- Do the difficulty, length, and elevation seem realistic?
- Are the source URLs formatted like real AllTrails/OnX/Gaia links?

2. HALLUCINATION DETECTION
Flag any of these red flags:
- Fabricated trail names (too generic or too specific without sources)
- Made-up URLs (e.g., alltrails.com/trail/fictional-path)
- Impossible statistics (e.g., 50-mile trail with 200ft elevation in mountains)
- Current condition claims without dated sources
- Contact information that seems fabricated

3. SOURCE QUALITY
- Are source URLs properly formatted for their claimed platform?
- AllTrails: alltrails.com/trail/us/state/trail-name
- OnX: onxmaps.com/offroad/... format
- Gaia: gaiagps.com/... format
- Are claims attributed to specific sources?

4. COMPLETENESS CHECK
- Does the response include the requested number of trails?
- Are all required fields populated?
- Is the vehicle compatibility assessment reasonable?

5. SAFETY CONSIDERATIONS
- Are difficulty ratings appropriately conservative?
- Are relevant warnings included?
- Are permit requirements mentioned where likely needed?

--- RESPONSE FORMAT ---
Return your evaluation as JSON:
{
  "passed": <boolean - true if response meets quality standards>,
  "overallScore": <1-10>,
  "accuracy": {
    "score": <1-10>,
    "issues": [<array of specific accuracy concerns>],
    "unverifiedClaims": [<claims that cannot be verified>]
  },
  "hallucination": {
    "detected": <boolean>,
    "examples": [<specific examples of likely hallucinations>],
    "severity": "<none|minor|moderate|severe>"
  },
  "completeness": {
    "score": <1-10>,
    "missingElements": [<what's missing>]
  },
  "sourceQuality": {
    "score": <1-10>,
    "issues": [<source quality problems>],
    "unverifiableSources": [<URLs or sources that seem fabricated>]
  },
  "improvements": [<specific actionable improvements needed>],
  "revisedResponse": "<if hallucinations detected, provide corrected version with uncertain info removed or marked>"
}

Be thorough and critical. It's better to flag potential issues than to let hallucinations pass.`;
}

/**
 * Build a judge prompt for evaluating trail analysis responses
 */
export function buildTrailAnalysisJudgePrompt(
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
): string {
  return `${JUDGE_SYSTEM_PROMPT}

--- EVALUATION TASK ---
Evaluate the following AI-generated trail analysis for accuracy and consistency.

--- ANALYSIS CONTEXT ---
Trail Name: ${context.trailName || 'Not provided'}
Location: ${context.trailLocation || 'Not provided'}
Vehicle: ${context.vehicleInfo ? `${context.vehicleInfo.year || ''} ${context.vehicleInfo.make} ${context.vehicleInfo.model}`.trim() : 'Not provided'}

--- AI RESPONSE TO EVALUATE ---
${aiResponse}

--- EVALUATION CRITERIA ---

1. VISUAL-CLAIM CONSISTENCY
The AI analyzed images. Check if claims are:
- Consistent with what could be observed visually
- Not making assumptions beyond visible information
- Using appropriate uncertainty language when extrapolating

2. TECHNICAL ACCURACY
- Are difficulty ratings internally consistent with described conditions?
- Do vehicle recommendations match the stated difficulty?
- Are tire pressure recommendations realistic for the terrain type?
- Are transfer case/locker recommendations appropriate?

3. SAFETY ASSESSMENT
- Are hazards appropriately identified and rated?
- Are recommendations sufficiently cautious?
- Is emergency communication info plausible for the area?

4. LOCAL KNOWLEDGE CLAIMS
Flag if the AI claims specific local knowledge without sources:
- Exact fuel station locations and distances
- Specific emergency service contacts (could be outdated)
- Current trail conditions (should note uncertainty)
- Permit requirements (should recommend verification)

5. HALLUCINATION INDICATORS
- Claims about what's "just beyond" the image
- Specific contact numbers without verification source
- Current condition assessments stated as fact
- Trail name/location claims if not provided in context

--- RESPONSE FORMAT ---
Return your evaluation as JSON:
{
  "passed": <boolean>,
  "overallScore": <1-10>,
  "accuracy": {
    "score": <1-10>,
    "issues": [<specific concerns>],
    "unverifiedClaims": [<claims needing verification>]
  },
  "hallucination": {
    "detected": <boolean>,
    "examples": [<specific examples>],
    "severity": "<none|minor|moderate|severe>"
  },
  "completeness": {
    "score": <1-10>,
    "missingElements": [<missing required elements>]
  },
  "sourceQuality": {
    "score": <1-10>,
    "issues": [<issues with claimed local knowledge>],
    "unverifiableSources": [<unverifiable claims>]
  },
  "improvements": [<specific improvements>],
  "revisedResponse": "<corrected version if needed>"
}`;
}

/**
 * Build a prompt for the judge to improve a response that failed evaluation
 */
export function buildImprovementPrompt(
  originalPrompt: string,
  originalResponse: string,
  judgeEvaluation: JudgeEvaluation
): string {
  return `You previously generated a response that was evaluated by a fact-checking system and found to have issues.

--- ORIGINAL PROMPT ---
${originalPrompt}

--- YOUR ORIGINAL RESPONSE ---
${originalResponse}

--- EVALUATION FEEDBACK ---
Overall Score: ${judgeEvaluation.overallScore}/10
Passed: ${judgeEvaluation.passed ? 'Yes' : 'No'}

ACCURACY ISSUES:
${judgeEvaluation.accuracy.issues.length > 0 ? judgeEvaluation.accuracy.issues.map(i => `- ${i}`).join('\n') : 'None identified'}

HALLUCINATION CONCERNS:
Severity: ${judgeEvaluation.hallucination.severity}
${judgeEvaluation.hallucination.examples.length > 0 ? judgeEvaluation.hallucination.examples.map(e => `- ${e}`).join('\n') : 'None identified'}

UNVERIFIED CLAIMS:
${judgeEvaluation.accuracy.unverifiedClaims.length > 0 ? judgeEvaluation.accuracy.unverifiedClaims.map(c => `- ${c}`).join('\n') : 'None identified'}

SOURCE QUALITY ISSUES:
${judgeEvaluation.sourceQuality.issues.length > 0 ? judgeEvaluation.sourceQuality.issues.map(i => `- ${i}`).join('\n') : 'None identified'}

REQUIRED IMPROVEMENTS:
${judgeEvaluation.improvements.map(i => `- ${i}`).join('\n')}

--- INSTRUCTIONS FOR IMPROVED RESPONSE ---
1. Address ALL the issues identified above
2. Remove or clearly mark any unverifiable information with uncertainty language
3. Replace fabricated details with honest uncertainty:
   - Instead of specific URLs, say "search [platform] for [trail name]"
   - Instead of exact distances, use ranges or "approximately"
   - Instead of current conditions, note "verify current conditions before visiting"
4. Be more conservative in your assessments
5. Clearly distinguish between observed facts and inferences
6. Add appropriate disclaimers for safety-critical information

Generate an improved response that addresses all feedback. Maintain the same JSON structure but with verified/corrected information only.`;
}

/**
 * Build a prompt for continuous self-improvement feedback
 */
export function buildSelfChallengePrompt(response: string): string {
  return `Before finalizing your response, critically evaluate it:

YOUR RESPONSE:
${response}

SELF-CHECK QUESTIONS:
1. Did I make any claims I cannot verify from the search results?
2. Are there any URLs that I generated rather than found?
3. Did I state current conditions as fact without recent verification?
4. Are my difficulty ratings conservative enough for safety?
5. Did I include appropriate uncertainty language?
6. Could any of my specific details be hallucinated?

If you identified issues, revise your response now to:
- Remove fabricated details
- Add uncertainty language where appropriate
- Be more conservative in assessments
- Replace specific unverified claims with honest uncertainty

Return your final, self-corrected response.`;
}

/**
 * Thresholds for automatic pass/fail
 */
export const JUDGE_THRESHOLDS = {
  // Minimum scores to pass (1-10 scale)
  minOverallScore: 7,
  minAccuracyScore: 7,
  minSourceQualityScore: 6,
  minCompletenessScore: 6,

  // Hallucination thresholds
  maxHallucinationSeverity: 'minor' as const, // 'none' | 'minor' allowed

  // If any of these are true, auto-fail
  autoFailConditions: {
    hallucinationSeverity: ['moderate', 'severe'],
    unverifiedClaimsCount: 5, // More than this = fail
    fabricatedSourcesCount: 2, // More than this = fail
  },
};

/**
 * Evaluate if a judge result passes thresholds
 */
export function evaluateJudgeResult(result: JudgeEvaluation): {
  passed: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  let passed = true;

  // Check overall score
  if (result.overallScore < JUDGE_THRESHOLDS.minOverallScore) {
    passed = false;
    reasons.push(`Overall score ${result.overallScore} below minimum ${JUDGE_THRESHOLDS.minOverallScore}`);
  }

  // Check accuracy score
  if (result.accuracy.score < JUDGE_THRESHOLDS.minAccuracyScore) {
    passed = false;
    reasons.push(`Accuracy score ${result.accuracy.score} below minimum ${JUDGE_THRESHOLDS.minAccuracyScore}`);
  }

  // Check hallucination severity
  if (JUDGE_THRESHOLDS.autoFailConditions.hallucinationSeverity.includes(result.hallucination.severity)) {
    passed = false;
    reasons.push(`Hallucination severity "${result.hallucination.severity}" exceeds threshold`);
  }

  // Check unverified claims count
  if (result.accuracy.unverifiedClaims.length > JUDGE_THRESHOLDS.autoFailConditions.unverifiedClaimsCount) {
    passed = false;
    reasons.push(`Too many unverified claims: ${result.accuracy.unverifiedClaims.length}`);
  }

  // Check fabricated sources
  if (result.sourceQuality.unverifiableSources.length > JUDGE_THRESHOLDS.autoFailConditions.fabricatedSourcesCount) {
    passed = false;
    reasons.push(`Too many unverifiable sources: ${result.sourceQuality.unverifiableSources.length}`);
  }

  return { passed, reasons };
}

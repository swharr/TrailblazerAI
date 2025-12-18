/**
 * Model Router - Intelligent routing of AI requests to the optimal provider
 *
 * Routes requests to different AI providers based on:
 * - Task type (analysis, generation, embedding)
 * - Cost optimization
 * - Rate limits and availability
 * - User preferences
 */

export type AIProvider = 'anthropic' | 'openai' | 'google' | 'bedrock';

export type TaskType = 'image_analysis' | 'text_generation' | 'embedding' | 'route_planning';

export interface ModelConfig {
  provider: AIProvider;
  model: string;
  maxTokens: number;
  costPer1kTokens: number;
  supportsVision: boolean;
}

export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'claude-3-5-sonnet': {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 8192,
    costPer1kTokens: 0.003,
    supportsVision: true,
  },
  'claude-3-haiku': {
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    maxTokens: 4096,
    costPer1kTokens: 0.00025,
    supportsVision: true,
  },
  'gpt-4o': {
    provider: 'openai',
    model: 'gpt-4o',
    maxTokens: 4096,
    costPer1kTokens: 0.005,
    supportsVision: true,
  },
  'gpt-4o-mini': {
    provider: 'openai',
    model: 'gpt-4o-mini',
    maxTokens: 4096,
    costPer1kTokens: 0.00015,
    supportsVision: true,
  },
  'gemini-pro': {
    provider: 'google',
    model: 'gemini-1.5-pro',
    maxTokens: 8192,
    costPer1kTokens: 0.00125,
    supportsVision: true,
  },
};

export interface RoutingOptions {
  taskType: TaskType;
  preferredProvider?: AIProvider;
  maxCostPerRequest?: number;
  requireVision?: boolean;
}

export interface RoutingResult {
  modelId: string;
  config: ModelConfig;
  reason: string;
}

/**
 * Select the optimal model for a given task
 */
export function routeToModel(options: RoutingOptions): RoutingResult {
  const { taskType, preferredProvider, maxCostPerRequest, requireVision } = options;

  // Filter models based on requirements
  let candidates = Object.entries(MODEL_CONFIGS);

  if (requireVision) {
    candidates = candidates.filter(([, config]) => config.supportsVision);
  }

  if (preferredProvider) {
    const preferred = candidates.filter(([, config]) => config.provider === preferredProvider);
    if (preferred.length > 0) {
      candidates = preferred;
    }
  }

  if (maxCostPerRequest !== undefined) {
    candidates = candidates.filter(([, config]) => config.costPer1kTokens <= maxCostPerRequest);
  }

  // Select based on task type
  let selected: [string, ModelConfig] | undefined;
  let reason: string;

  switch (taskType) {
    case 'image_analysis':
      // Prefer Claude for image analysis
      selected = candidates.find(([, c]) => c.provider === 'anthropic' && c.supportsVision);
      reason = 'Best vision capabilities for trail photo analysis';
      break;

    case 'route_planning':
      // Prefer larger context models for complex planning
      selected = candidates.sort((a, b) => b[1].maxTokens - a[1].maxTokens)[0];
      reason = 'Large context window for route planning';
      break;

    case 'embedding':
      // Use cost-effective models for embeddings
      selected = candidates.sort((a, b) => a[1].costPer1kTokens - b[1].costPer1kTokens)[0];
      reason = 'Cost-optimized for batch embeddings';
      break;

    default:
      // Default to best value
      selected = candidates.sort((a, b) => a[1].costPer1kTokens - b[1].costPer1kTokens)[0];
      reason = 'Default cost-optimized selection';
  }

  if (!selected) {
    // Fallback to Claude Haiku
    selected = ['claude-3-haiku', MODEL_CONFIGS['claude-3-haiku']];
    reason = 'Fallback to default model';
  }

  return {
    modelId: selected[0],
    config: selected[1],
    reason,
  };
}

/**
 * Get available providers based on configured API keys
 */
export function getAvailableProviders(): AIProvider[] {
  const providers: AIProvider[] = [];

  if (process.env.ANTHROPIC_API_KEY) providers.push('anthropic');
  if (process.env.OPENAI_API_KEY) providers.push('openai');
  if (process.env.GOOGLE_AI_API_KEY) providers.push('google');
  if (process.env.AWS_BEDROCK_REGION) providers.push('bedrock');

  return providers;
}

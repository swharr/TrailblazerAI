// lib/cost-tracker.ts

import { AnalysisMetrics, ModelName } from './types';

/**
 * Pricing per million tokens for each supported model
 */
export const MODEL_COSTS: Record<
  ModelName,
  { inputPer1M: number; outputPer1M: number }
> = {
  // Anthropic models
  'claude-sonnet-4-20250514': { inputPer1M: 3.0, outputPer1M: 15.0 },
  'claude-opus-4-20250514': { inputPer1M: 15.0, outputPer1M: 75.0 },
  'claude-3-5-sonnet-20241022': { inputPer1M: 3.0, outputPer1M: 15.0 },
  'claude-3-5-haiku-20241022': { inputPer1M: 0.8, outputPer1M: 4.0 },
  // OpenAI models
  'gpt-4o': { inputPer1M: 2.5, outputPer1M: 10.0 },
  'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.6 },
  'gpt-4-turbo': { inputPer1M: 10.0, outputPer1M: 30.0 },
  'o1': { inputPer1M: 15.0, outputPer1M: 60.0 },
  'o1-mini': { inputPer1M: 3.0, outputPer1M: 12.0 },
  // Google models
  'gemini-2.0-flash': { inputPer1M: 0.1, outputPer1M: 0.4 },
  'gemini-1.5-pro': { inputPer1M: 1.25, outputPer1M: 5.0 },
  'gemini-1.5-flash': { inputPer1M: 0.075, outputPer1M: 0.3 },
  'gemini-pro': { inputPer1M: 0.5, outputPer1M: 1.5 },
  'gemini-pro-vision': { inputPer1M: 0.5, outputPer1M: 1.5 },
  // xAI (Grok) models - placeholder pricing
  'grok-2': { inputPer1M: 2.0, outputPer1M: 10.0 },
  'grok-2-vision': { inputPer1M: 2.0, outputPer1M: 10.0 },
  'grok-2-vision-1212': { inputPer1M: 2.0, outputPer1M: 10.0 },
};

/**
 * Calculate the cost of an API call in dollars
 * @param model - The model name used
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Cost in dollars
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_COSTS[model as ModelName];
  if (!pricing) {
    // Try to match Bedrock model patterns
    if (model.startsWith('anthropic.claude-3-5-sonnet')) {
      return calculateCost('claude-3-5-sonnet-20241022', inputTokens, outputTokens);
    }
    if (model.startsWith('anthropic.claude-3-sonnet')) {
      return calculateCost('claude-3-5-sonnet-20241022', inputTokens, outputTokens); // Similar pricing
    }
    if (model.startsWith('anthropic.claude-3-haiku')) {
      return calculateCost('claude-3-5-haiku-20241022', inputTokens, outputTokens);
    }
    console.warn(`Unknown model: ${model}, defaulting to zero cost`);
    return 0;
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;

  return inputCost + outputCost;
}

/**
 * In-memory storage for metrics
 */
let metricsStore: AnalysisMetrics[] = [];

/**
 * Add a metric to the in-memory store
 * @param metric - The AnalysisMetrics object to track
 */
export function trackMetric(metric: AnalysisMetrics): void {
  metricsStore.push(metric);
}

/**
 * Get the start of a time period
 */
function getTimeframeStart(timeframe: 'today' | 'week' | 'month'): Date {
  const now = new Date();

  switch (timeframe) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'week':
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      weekStart.setHours(0, 0, 0, 0);
      return weekStart;
    case 'month':
      const monthStart = new Date(now);
      monthStart.setDate(now.getDate() - 30);
      monthStart.setHours(0, 0, 0, 0);
      return monthStart;
  }
}

/**
 * Get metrics filtered by timeframe
 * @param timeframe - Optional filter: 'today', 'week', or 'month'
 * @returns Array of AnalysisMetrics matching the timeframe
 */
export function getMetrics(
  timeframe?: 'today' | 'week' | 'month'
): AnalysisMetrics[] {
  if (!timeframe) {
    return [...metricsStore];
  }

  const startDate = getTimeframeStart(timeframe);

  return metricsStore.filter((metric) => {
    const metricDate = new Date(metric.timestamp);
    return metricDate >= startDate;
  });
}

/**
 * Aggregated metrics by model
 */
export interface ModelMetricsSummary {
  calls: number;
  cost: number;
  avgLatency: number;
}

/**
 * Get metrics aggregated by model
 * @returns Record of model names to aggregated metrics
 */
export function getMetricsByModel(): Record<string, ModelMetricsSummary> {
  const byModel: Record<
    string,
    { calls: number; totalCost: number; totalLatency: number }
  > = {};

  for (const metric of metricsStore) {
    if (!byModel[metric.model]) {
      byModel[metric.model] = { calls: 0, totalCost: 0, totalLatency: 0 };
    }

    byModel[metric.model].calls += 1;
    byModel[metric.model].totalCost += metric.cost;
    byModel[metric.model].totalLatency += metric.latency;
  }

  const result: Record<string, ModelMetricsSummary> = {};

  for (const [model, data] of Object.entries(byModel)) {
    result[model] = {
      calls: data.calls,
      cost: data.totalCost,
      avgLatency: data.calls > 0 ? data.totalLatency / data.calls : 0,
    };
  }

  return result;
}

/**
 * Clear all stored metrics
 */
export function clearMetrics(): void {
  metricsStore = [];
}

/**
 * Format a cost value as a dollar string
 * @param cost - Cost in dollars
 * @returns Formatted string like "$0.0823"
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

/**
 * Get the total cost of all tracked metrics
 * @returns Total cost in dollars
 */
export function getTotalCost(): number {
  return metricsStore.reduce((sum, metric) => sum + metric.cost, 0);
}

/**
 * Create an AnalysisMetrics object with calculated cost
 * Helper for creating metrics entries
 */
export function createMetric(
  model: string,
  inputTokens: number,
  outputTokens: number,
  latency: number
): AnalysisMetrics {
  return {
    model: model as ModelName,
    inputTokens,
    outputTokens,
    cost: calculateCost(model, inputTokens, outputTokens),
    latency,
    timestamp: new Date().toISOString(),
  };
}

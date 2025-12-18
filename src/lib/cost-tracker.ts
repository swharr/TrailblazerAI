/**
 * Cost Tracker - Monitor and manage AI API usage costs
 *
 * Tracks:
 * - Per-request costs
 * - Daily/monthly totals
 * - Budget limits and alerts
 * - Cost by provider and model
 */

import { AIProvider } from './model-router';

export interface UsageRecord {
  id: string;
  timestamp: Date;
  provider: AIProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  taskType: string;
}

export interface CostSummary {
  totalCost: number;
  byProvider: Record<AIProvider, number>;
  byModel: Record<string, number>;
  byTaskType: Record<string, number>;
  requestCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

export interface BudgetConfig {
  monthlyLimit: number;
  dailyLimit?: number;
  alertThreshold: number; // Percentage (0-1) at which to alert
}

// In-memory storage for demo purposes
// In production, this would be persisted to a database
let usageRecords: UsageRecord[] = [];
let budgetConfig: BudgetConfig = {
  monthlyLimit: 50,
  dailyLimit: 5,
  alertThreshold: 0.8,
};

/**
 * Record a new API usage event
 */
export function recordUsage(record: Omit<UsageRecord, 'id' | 'timestamp'>): UsageRecord {
  const newRecord: UsageRecord = {
    ...record,
    id: crypto.randomUUID(),
    timestamp: new Date(),
  };

  usageRecords.push(newRecord);

  // Check budget alerts
  checkBudgetAlerts();

  return newRecord;
}

/**
 * Calculate cost for a request
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  inputCostPer1k: number,
  outputCostPer1k: number
): number {
  const inputCost = (inputTokens / 1000) * inputCostPer1k;
  const outputCost = (outputTokens / 1000) * outputCostPer1k;
  return inputCost + outputCost;
}

/**
 * Get cost summary for a time period
 */
export function getCostSummary(startDate?: Date, endDate?: Date): CostSummary {
  let records = usageRecords;

  if (startDate) {
    records = records.filter((r) => r.timestamp >= startDate);
  }
  if (endDate) {
    records = records.filter((r) => r.timestamp <= endDate);
  }

  const summary: CostSummary = {
    totalCost: 0,
    byProvider: {} as Record<AIProvider, number>,
    byModel: {},
    byTaskType: {},
    requestCount: records.length,
    totalInputTokens: 0,
    totalOutputTokens: 0,
  };

  for (const record of records) {
    summary.totalCost += record.cost;
    summary.totalInputTokens += record.inputTokens;
    summary.totalOutputTokens += record.outputTokens;

    summary.byProvider[record.provider] =
      (summary.byProvider[record.provider] || 0) + record.cost;
    summary.byModel[record.model] = (summary.byModel[record.model] || 0) + record.cost;
    summary.byTaskType[record.taskType] =
      (summary.byTaskType[record.taskType] || 0) + record.cost;
  }

  return summary;
}

/**
 * Get current month's cost summary
 */
export function getCurrentMonthCost(): CostSummary {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return getCostSummary(startOfMonth);
}

/**
 * Get today's cost summary
 */
export function getTodayCost(): CostSummary {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return getCostSummary(startOfDay);
}

/**
 * Check if budget limits are exceeded or approaching
 */
export function checkBudgetAlerts(): {
  monthlyExceeded: boolean;
  dailyExceeded: boolean;
  monthlyWarning: boolean;
  dailyWarning: boolean;
} {
  const monthlySummary = getCurrentMonthCost();
  const dailySummary = getTodayCost();

  const monthlyExceeded = monthlySummary.totalCost >= budgetConfig.monthlyLimit;
  const dailyExceeded = budgetConfig.dailyLimit
    ? dailySummary.totalCost >= budgetConfig.dailyLimit
    : false;

  const monthlyWarning =
    monthlySummary.totalCost >= budgetConfig.monthlyLimit * budgetConfig.alertThreshold;
  const dailyWarning = budgetConfig.dailyLimit
    ? dailySummary.totalCost >= budgetConfig.dailyLimit * budgetConfig.alertThreshold
    : false;

  return {
    monthlyExceeded,
    dailyExceeded,
    monthlyWarning,
    dailyWarning,
  };
}

/**
 * Update budget configuration
 */
export function setBudgetConfig(config: Partial<BudgetConfig>): BudgetConfig {
  budgetConfig = { ...budgetConfig, ...config };
  return budgetConfig;
}

/**
 * Get current budget configuration
 */
export function getBudgetConfig(): BudgetConfig {
  return { ...budgetConfig };
}

/**
 * Get remaining budget
 */
export function getRemainingBudget(): {
  monthly: number;
  daily: number | null;
} {
  const monthlySummary = getCurrentMonthCost();
  const dailySummary = getTodayCost();

  return {
    monthly: Math.max(0, budgetConfig.monthlyLimit - monthlySummary.totalCost),
    daily: budgetConfig.dailyLimit
      ? Math.max(0, budgetConfig.dailyLimit - dailySummary.totalCost)
      : null,
  };
}

/**
 * Clear usage records (for testing or reset)
 */
export function clearUsageRecords(): void {
  usageRecords = [];
}

/**
 * Export usage records for backup/analysis
 */
export function exportUsageRecords(): UsageRecord[] {
  return [...usageRecords];
}

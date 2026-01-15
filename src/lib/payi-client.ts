/**
 * Pay-i REST API Client
 *
 * Tracks AI usage and costs via the Pay-i ingest API.
 * Provides use case tracking, limits management, and KPI tracking.
 * See: https://docs.pay-i.com/docs/rest-ingest
 */

// ============================================================================
// Ingest API Types
// ============================================================================

export interface PayiIngestRequest {
  /** Resource category (e.g., 'system.anthropic') */
  category: string;
  /** Resource/model name (e.g., 'claude-sonnet-4-20250514') */
  resource: string;
  /** Token counts */
  units: {
    text: {
      input: number;
      output: number;
    };
  };
  /** Event timestamp in ISO 8601 format */
  event_timestamp?: string;
  /** End-to-end latency in milliseconds */
  end_to_end_latency_ms?: number;
  /** Time to first token in milliseconds */
  time_to_first_token_ms?: number;
  /** HTTP status code */
  http_status_code?: number;
  /** Provider URI */
  provider_uri?: string;
  /** User ID for tracking */
  user_id?: string;
  /** Account name for grouping users */
  account_name?: string;
  /** Use case name for categorization */
  use_case_name?: string;
  /** Use case instance ID (unique per execution) */
  use_case_id?: string;
  /** Use case version for tracking changes over time */
  use_case_version?: number;
  /** Limit IDs to associate with this request */
  limit_ids?: string[];
  /** Custom use case properties (business-level metadata) */
  use_case_properties?: Record<string, string>;
  /** Custom request properties (request-level metadata) */
  request_properties?: Record<string, string>;
}

export interface PayiIngestResponse {
  event_timestamp: string;
  ingest_timestamp: string;
  request_id: string;
  xproxy_result?: {
    cost?: number;
    input_cost?: number;
    output_cost?: number;
    limits?: Record<string, LimitStatus>;
  };
}

export type LimitStatusType = 'ok' | 'exceeded' | 'overrun' | 'blocked';

export interface LimitStatus {
  status: LimitStatusType;
  remaining?: number;
  max?: number;
}

// ============================================================================
// Limits API Types
// ============================================================================

export type LimitType = 'block' | 'allow';

export interface CreateLimitRequest {
  /** Name identifier for the limit */
  limit_name: string;
  /** Maximum budget value */
  max: number;
  /** Custom identifier (auto-generated if omitted) */
  limit_id?: string;
  /** Warning threshold before max is reached */
  threshold?: number;
  /** Enforcement mode: 'block' prevents requests, 'allow' only monitors */
  limit_type?: LimitType;
  /** Custom metadata key-value pairs */
  properties?: Record<string, string>;
}

export interface Limit {
  limit_id: string;
  limit_name: string;
  max: number;
  threshold?: number;
  limit_type: LimitType;
  limit_creation_timestamp: string;
  limit_update_timestamp: string;
  properties?: Record<string, string>;
  totals: {
    cost: {
      input: { base: number };
      output: { base: number };
      total: { base: number; overrun_base?: number };
    };
    requests: {
      ok: number;
      exceeded: number;
      overrun: number;
      blocked: number;
      blocked_external: number;
      failed: number;
      total: number;
    };
  };
}

export interface LimitResponse {
  request_id: string;
  limit: Limit;
  message?: string;
}

export interface LimitsListResponse {
  request_id: string;
  cursor?: string;
  items: Limit[];
}

// ============================================================================
// Use Case API Types
// ============================================================================

export interface CreateUseCaseDefinitionRequest {
  /** Unique name for the use case */
  use_case_name: string;
  /** Human-readable description */
  description?: string;
  /** Custom metadata */
  properties?: Record<string, string>;
}

export interface UseCaseDefinition {
  use_case_name: string;
  description?: string;
  properties?: Record<string, string>;
  creation_timestamp: string;
  update_timestamp: string;
}

export interface CreateUseCaseInstanceRequest {
  /** Optional custom instance ID (auto-generated if omitted) */
  use_case_id?: string;
  /** Version number for this instance */
  use_case_version?: number;
  /** User who initiated this instance */
  user_id?: string;
  /** Account grouping */
  account_name?: string;
  /** Limit IDs to apply to this instance */
  limit_ids?: string[];
  /** Custom instance metadata */
  properties?: Record<string, string>;
}

export interface UseCaseInstance {
  use_case_name: string;
  use_case_id: string;
  use_case_version?: number;
  user_id?: string;
  account_name?: string;
  limit_ids?: string[];
  properties?: Record<string, string>;
  creation_timestamp: string;
}

// ============================================================================
// KPI API Types
// ============================================================================

export interface CreateKpiRequest {
  /** Unique name for the KPI */
  kpi_name: string;
  /** Human-readable description */
  description?: string;
  /** Value type: 'boolean' for success/fail, 'numeric' for scores */
  value_type?: 'boolean' | 'numeric';
}

export interface Kpi {
  kpi_name: string;
  description?: string;
  value_type: 'boolean' | 'numeric';
  creation_timestamp: string;
}

export interface UpdateKpiScoreRequest {
  /** Score value (true/false for boolean, number for numeric) */
  value: boolean | number;
  /** Optional timestamp for the score */
  timestamp?: string;
}

export interface PayiConfig {
  /** Pay-i API base URL (e.g., 'https://your-app.pay-i.com') */
  baseUrl: string;
  /** Pay-i API key */
  apiKey: string;
  /** Whether instrumentation is enabled */
  enabled: boolean;
}

/**
 * Get Pay-i configuration from environment variables
 */
export function getPayiConfig(): PayiConfig {
  const baseUrl = process.env.PAYI_BASE_URL || '';
  const apiKey = process.env.PAYI_API_KEY || '';
  const enabled = !!(baseUrl && apiKey);

  return {
    baseUrl,
    apiKey,
    enabled,
  };
}

/**
 * Pay-i client for tracking AI usage
 */
export class PayiClient {
  private config: PayiConfig;

  constructor(config?: Partial<PayiConfig>) {
    const envConfig = getPayiConfig();
    this.config = {
      ...envConfig,
      ...config,
    };
  }

  /**
   * Check if Pay-i instrumentation is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Make an authenticated API request to Pay-i
   */
  private async apiRequest<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T | null> {
    if (!this.config.enabled) {
      console.debug('[Pay-i] Instrumentation disabled, skipping request');
      return null;
    }

    const url = `${this.config.baseUrl}${path}`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'xProxy-api-key': this.config.apiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Pay-i] ${method} ${path} failed:`, response.status, errorText);
        return null;
      }

      return (await response.json()) as T;
    } catch (error) {
      console.error(`[Pay-i] ${method} ${path} error:`, error);
      return null;
    }
  }

  // ============================================================================
  // Ingest API
  // ============================================================================

  /**
   * Submit an AI usage event to Pay-i
   */
  async ingest(request: PayiIngestRequest): Promise<PayiIngestResponse | null> {
    const data = await this.apiRequest<PayiIngestResponse>('POST', '/api/v1/ingest', {
      ...request,
      event_timestamp: request.event_timestamp || new Date().toISOString(),
    });

    if (data) {
      console.log('[Pay-i] Event ingested:', {
        request_id: data.request_id,
        cost: data.xproxy_result?.cost,
        limits: data.xproxy_result?.limits,
      });
    }

    return data;
  }

  /**
   * Track an Anthropic API call with full context
   */
  async trackAnthropicCall(params: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    userId?: string;
    accountName?: string;
    useCaseName?: string;
    useCaseId?: string;
    useCaseVersion?: number;
    limitIds?: string[];
    useCaseProperties?: Record<string, string>;
    requestProperties?: Record<string, string>;
    httpStatus?: number;
    timeToFirstTokenMs?: number;
  }): Promise<PayiIngestResponse | null> {
    return this.ingest({
      category: 'system.anthropic',
      resource: params.model,
      units: {
        text: {
          input: params.inputTokens,
          output: params.outputTokens,
        },
      },
      end_to_end_latency_ms: params.latencyMs,
      time_to_first_token_ms: params.timeToFirstTokenMs,
      http_status_code: params.httpStatus || 200,
      provider_uri: 'https://api.anthropic.com/v1/messages',
      user_id: params.userId,
      account_name: params.accountName,
      use_case_name: params.useCaseName || 'trail_analysis',
      use_case_id: params.useCaseId,
      use_case_version: params.useCaseVersion,
      limit_ids: params.limitIds,
      use_case_properties: params.useCaseProperties,
      request_properties: params.requestProperties,
    });
  }

  // ============================================================================
  // Limits API
  // ============================================================================

  /**
   * Create a new spending limit
   */
  async createLimit(request: CreateLimitRequest): Promise<LimitResponse | null> {
    return this.apiRequest<LimitResponse>('POST', '/api/v1/limits', request);
  }

  /**
   * Get all limits with optional filtering
   */
  async getLimits(params?: {
    limitName?: string;
    sortAscending?: boolean;
    limit?: number;
    cursor?: string;
  }): Promise<LimitsListResponse | null> {
    const searchParams = new URLSearchParams();
    if (params?.limitName) searchParams.set('limit_name', params.limitName);
    if (params?.sortAscending !== undefined)
      searchParams.set('sort_ascending', String(params.sortAscending));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.cursor) searchParams.set('cursor', params.cursor);

    const query = searchParams.toString();
    const path = `/api/v1/limits${query ? `?${query}` : ''}`;

    return this.apiRequest<LimitsListResponse>('GET', path);
  }

  /**
   * Get a specific limit by ID
   */
  async getLimit(limitId: string): Promise<LimitResponse | null> {
    return this.apiRequest<LimitResponse>('GET', `/api/v1/limits/${limitId}`);
  }

  /**
   * Update a limit's max value or name
   */
  async updateLimit(
    limitId: string,
    updates: { limit_name?: string; max?: number; threshold?: number }
  ): Promise<LimitResponse | null> {
    return this.apiRequest<LimitResponse>('PUT', `/api/v1/limits/${limitId}`, updates);
  }

  /**
   * Update a limit's custom properties
   */
  async updateLimitProperties(
    limitId: string,
    properties: Record<string, string>
  ): Promise<LimitResponse | null> {
    return this.apiRequest<LimitResponse>('PUT', `/api/v1/limits/${limitId}/properties`, {
      properties,
    });
  }

  /**
   * Reset a limit's counters
   */
  async resetLimit(limitId: string): Promise<LimitResponse | null> {
    return this.apiRequest<LimitResponse>('POST', `/api/v1/limits/${limitId}/reset`, {});
  }

  /**
   * Delete a limit
   */
  async deleteLimit(limitId: string): Promise<boolean> {
    const result = await this.apiRequest<{ request_id: string }>(
      'DELETE',
      `/api/v1/limits/${limitId}`
    );
    return result !== null;
  }

  // ============================================================================
  // Use Case API
  // ============================================================================

  /**
   * Create a use case definition
   */
  async createUseCaseDefinition(
    request: CreateUseCaseDefinitionRequest
  ): Promise<UseCaseDefinition | null> {
    return this.apiRequest<UseCaseDefinition>(
      'POST',
      '/api/v1/use_cases/definitions',
      request
    );
  }

  /**
   * Get all use case definitions
   */
  async getUseCaseDefinitions(): Promise<{ items: UseCaseDefinition[] } | null> {
    return this.apiRequest<{ items: UseCaseDefinition[] }>(
      'GET',
      '/api/v1/use_cases/definitions'
    );
  }

  /**
   * Get a specific use case definition
   */
  async getUseCaseDefinition(useCaseName: string): Promise<UseCaseDefinition | null> {
    return this.apiRequest<UseCaseDefinition>(
      'GET',
      `/api/v1/use_cases/definitions/${encodeURIComponent(useCaseName)}`
    );
  }

  /**
   * Create a use case instance
   */
  async createUseCaseInstance(
    useCaseName: string,
    request?: CreateUseCaseInstanceRequest
  ): Promise<UseCaseInstance | null> {
    return this.apiRequest<UseCaseInstance>(
      'POST',
      `/api/v1/use_cases/instances/${encodeURIComponent(useCaseName)}`,
      request || {}
    );
  }

  // ============================================================================
  // KPI API
  // ============================================================================

  /**
   * Create a KPI definition for a use case
   */
  async createKpi(useCaseName: string, request: CreateKpiRequest): Promise<Kpi | null> {
    return this.apiRequest<Kpi>(
      'POST',
      `/api/v1/use_cases/definitions/${encodeURIComponent(useCaseName)}/kpis`,
      request
    );
  }

  /**
   * Get all KPIs for a use case
   */
  async getKpis(useCaseName: string): Promise<{ items: Kpi[] } | null> {
    return this.apiRequest<{ items: Kpi[] }>(
      'GET',
      `/api/v1/use_cases/definitions/${encodeURIComponent(useCaseName)}/kpis`
    );
  }

  /**
   * Update a KPI score for a specific use case instance
   */
  async updateKpiScore(
    useCaseName: string,
    useCaseId: string,
    kpiName: string,
    request: UpdateKpiScoreRequest
  ): Promise<boolean> {
    const result = await this.apiRequest<{ request_id: string }>(
      'PUT',
      `/api/v1/use_cases/instances/${encodeURIComponent(useCaseName)}/${encodeURIComponent(useCaseId)}/kpis/${encodeURIComponent(kpiName)}`,
      request
    );
    return result !== null;
  }
}

// Singleton instance for convenience
let payiClientInstance: PayiClient | null = null;

/**
 * Get the singleton Pay-i client instance
 */
export function getPayiClient(): PayiClient {
  if (!payiClientInstance) {
    payiClientInstance = new PayiClient();
  }
  return payiClientInstance;
}

/**
 * Generate a unique use case instance ID
 */
export function generateUseCaseId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Track an Anthropic API call using the singleton client
 */
export async function trackAnthropicUsage(params: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  userId?: string;
  accountName?: string;
  useCaseName?: string;
  useCaseId?: string;
  useCaseVersion?: number;
  limitIds?: string[];
  useCaseProperties?: Record<string, string>;
  requestProperties?: Record<string, string>;
  httpStatus?: number;
  timeToFirstTokenMs?: number;
}): Promise<PayiIngestResponse | null> {
  const client = getPayiClient();
  if (client.isEnabled()) {
    // Fire and forget - don't block the response
    return client.trackAnthropicCall(params).catch((err) => {
      console.error('[Pay-i] Failed to track usage:', err);
      return null;
    });
  }
  return null;
}

/**
 * Track a successful trail analysis with KPI scoring
 */
export async function trackTrailAnalysisSuccess(params: {
  useCaseId: string;
  difficulty?: number;
  imageCount?: number;
  hasVehicleInfo?: boolean;
}): Promise<void> {
  const client = getPayiClient();
  if (client.isEnabled()) {
    // Update the analysis_success KPI
    client
      .updateKpiScore('trail_analysis', params.useCaseId, 'analysis_success', {
        value: true,
      })
      .catch((err) => {
        console.error('[Pay-i] Failed to update KPI:', err);
      });
  }
}

// ============================================================================
// Pay-i Proxy Client
// ============================================================================

export interface PayiProxyConfig {
  /** Pay-i proxy service URL (e.g., 'http://payi-proxy:8000') */
  baseUrl: string;
  /** Whether proxy is enabled */
  enabled: boolean;
}

export interface PayiProxyAnalyzeRequest {
  images: string[];
  model: string;
  /** Full analysis prompt - proxy will use this directly */
  prompt: string;
  vehicle_info?: {
    make: string;
    model: string;
    year?: number;
    features?: string[];
    suspension_brand?: string;
    suspension_travel?: string;
  };
  context?: {
    trail_name?: string;
    trail_location?: string;
    additional_notes?: string;
  };
  user_id?: string;
  account_name?: string;
  limit_ids?: string[];
}

export interface PayiProxyAnalyzeResponse {
  success: boolean;
  text: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cost?: number;
    input_cost?: number;
    output_cost?: number;
  };
  use_case_id: string;
  payi_request_id?: string;
  error?: string;
}

/**
 * Get Pay-i proxy configuration from environment variables
 */
export function getPayiProxyConfig(): PayiProxyConfig {
  const baseUrl = process.env.PAYI_PROXY_URL || '';
  const enabled = !!baseUrl;

  return {
    baseUrl,
    enabled,
  };
}

/**
 * Check if Pay-i proxy is enabled
 */
export function isPayiProxyEnabled(): boolean {
  return !!process.env.PAYI_PROXY_URL;
}

/**
 * Call the Pay-i proxy service for trail analysis with full instrumentation
 */
export async function analyzeViaPayiProxy(
  request: PayiProxyAnalyzeRequest
): Promise<PayiProxyAnalyzeResponse> {
  const config = getPayiProxyConfig();

  if (!config.enabled) {
    throw new Error('Pay-i proxy is not configured');
  }

  const url = `${config.baseUrl}/analyze`;

  console.log('[Pay-i Proxy] Calling proxy service:', {
    url,
    imageCount: request.images.length,
    model: request.model,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Pay-i Proxy] Request failed:', response.status, errorText);
    throw new Error(`Pay-i proxy error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as PayiProxyAnalyzeResponse;

  console.log('[Pay-i Proxy] Response received:', {
    success: data.success,
    inputTokens: data.usage.input_tokens,
    outputTokens: data.usage.output_tokens,
    useCaseId: data.use_case_id,
  });

  return data;
}

/**
 * Pay-i REST API Client
 *
 * Tracks AI usage and costs via the Pay-i ingest API.
 * See: https://docs.pay-i.com/docs/rest-ingest
 */

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
  /** Use case name for categorization */
  use_case_name?: string;
}

export interface PayiIngestResponse {
  event_timestamp: string;
  ingest_timestamp: string;
  request_id: string;
  xproxy_result?: {
    cost?: number;
    input_cost?: number;
    output_cost?: number;
  };
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
   * Submit an AI usage event to Pay-i
   */
  async ingest(request: PayiIngestRequest): Promise<PayiIngestResponse | null> {
    if (!this.config.enabled) {
      console.debug('[Pay-i] Instrumentation disabled, skipping ingest');
      return null;
    }

    const url = `${this.config.baseUrl}/api/v1/ingest`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xProxy-api-key': this.config.apiKey,
        },
        body: JSON.stringify({
          ...request,
          event_timestamp: request.event_timestamp || new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Pay-i] Ingest failed:', response.status, errorText);
        return null;
      }

      const data = (await response.json()) as PayiIngestResponse;
      console.log('[Pay-i] Event ingested:', {
        request_id: data.request_id,
        cost: data.xproxy_result?.cost,
      });

      return data;
    } catch (error) {
      console.error('[Pay-i] Ingest error:', error);
      return null;
    }
  }

  /**
   * Track an Anthropic API call
   */
  async trackAnthropicCall(params: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    userId?: string;
    useCaseName?: string;
    httpStatus?: number;
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
      http_status_code: params.httpStatus || 200,
      provider_uri: 'https://api.anthropic.com/v1/messages',
      user_id: params.userId,
      use_case_name: params.useCaseName || 'trail_analysis',
    });
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
 * Track an Anthropic API call using the singleton client
 */
export async function trackAnthropicUsage(params: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  userId?: string;
  useCaseName?: string;
  httpStatus?: number;
}): Promise<void> {
  const client = getPayiClient();
  if (client.isEnabled()) {
    // Fire and forget - don't block the response
    client.trackAnthropicCall(params).catch((err) => {
      console.error('[Pay-i] Failed to track usage:', err);
    });
  }
}

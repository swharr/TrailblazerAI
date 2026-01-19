// lib/model-clients/base.ts

import { Message, ModelConfig } from '../types';

/**
 * Token usage information returned from model API calls
 */
export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

/**
 * Response from image analysis operations
 */
export interface AnalysisResponse {
  text: string;
  usage: Usage;
}

/**
 * Response from chat/conversation operations
 */
export interface ChatResponse {
  content: string;
  usage: Usage;
}

/**
 * Abstract interface that all model provider implementations must satisfy.
 * This provides a unified API for interacting with different AI providers
 * (Anthropic, OpenAI, Google, AWS Bedrock).
 */
export interface ModelProvider {
  /**
   * Analyze an image and return structured analysis results
   * @param imageBase64 - Base64 encoded image data
   * @param prompt - The analysis prompt to send with the image
   * @returns Promise resolving to analysis text and token usage
   */
  analyzeImage(imageBase64: string, prompt: string): Promise<AnalysisResponse>;

  /**
   * Analyze multiple images and return structured analysis results
   * @param imagesBase64 - Array of base64 encoded image data
   * @param prompt - The analysis prompt to send with the images
   * @returns Promise resolving to analysis text and token usage
   */
  analyzeImages(imagesBase64: string[], prompt: string): Promise<AnalysisResponse>;

  /**
   * Send a chat conversation to the model
   * @param messages - Array of conversation messages
   * @param stream - Optional flag to enable streaming responses
   * @returns Promise resolving to response content and token usage
   */
  chat(messages: Message[], stream?: boolean): Promise<ChatResponse>;

  /**
   * Get configuration information about the model
   * @returns ModelConfig containing provider, name, capabilities, and pricing
   */
  getModelInfo(): ModelConfig;
}

/**
 * Base configuration options for initializing a model client
 */
export interface ModelClientOptions {
  apiKey: string;
  baseUrl?: string;
  maxRetries?: number;
  timeout?: number;
}

/**
 * Error thrown when a model API call fails
 */
export class ModelError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'ModelError';
  }
}

/**
 * Error thrown when rate limits are exceeded
 */
export class RateLimitError extends ModelError {
  constructor(
    provider: string,
    public readonly retryAfterMs?: number
  ) {
    super(`Rate limit exceeded for ${provider}`, provider, 429, true);
    this.name = 'RateLimitError';
  }
}

// lib/model-clients/anthropic.ts

import Anthropic from '@anthropic-ai/sdk';
import { Message, ModelConfig } from '../types';
import {
  ModelProvider,
  AnalysisResponse,
  ChatResponse,
  ModelError,
  RateLimitError,
} from './base';

/** Maximum image size in bytes (5MB - Anthropic API limit) */
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

/** Default model to use */
const DEFAULT_MODEL = 'claude-sonnet-4-20250514' as const;

/** Maximum tokens for responses */
const MAX_TOKENS = 2048;

/**
 * Anthropic Claude API client implementing the ModelProvider interface.
 * Provides image analysis and chat capabilities using Claude models.
 */
export class AnthropicClient implements ModelProvider {
  private client: Anthropic;
  private model: typeof DEFAULT_MODEL;

  /**
   * Create a new AnthropicClient
   * @param apiKey - Optional API key (defaults to ANTHROPIC_API_KEY env var)
   * @throws ModelError if no API key is provided or found
   */
  constructor(apiKey?: string) {
    const key = apiKey || process.env.ANTHROPIC_API_KEY;

    if (!key) {
      throw new ModelError(
        'Anthropic API key is required. Set ANTHROPIC_API_KEY environment variable or pass apiKey to constructor.',
        'anthropic'
      );
    }

    this.client = new Anthropic({ apiKey: key });
    this.model = DEFAULT_MODEL;
  }

  /**
   * Get configuration information about this model
   */
  getModelInfo(): ModelConfig {
    return {
      provider: 'anthropic',
      name: this.model,
      displayName: 'Claude Sonnet 4',
      supportsVision: true,
      costPer1kInputTokens: 0.003, // $3.00 per 1M = $0.003 per 1K
      costPer1kOutputTokens: 0.015, // $15.00 per 1M = $0.015 per 1K
    };
  }

  /**
   * Analyze an image using Claude's vision capabilities
   * @param imageBase64 - Base64 encoded image data (with or without data URL prefix)
   * @param prompt - The analysis prompt to send with the image
   * @returns Analysis text and token usage
   */
  async analyzeImage(
    imageBase64: string,
    prompt: string
  ): Promise<AnalysisResponse> {
    return this.analyzeImages([imageBase64], prompt);
  }

  /**
   * Analyze multiple images using Claude's vision capabilities
   * @param imagesBase64 - Array of base64 encoded image data (with or without data URL prefix)
   * @param prompt - The analysis prompt to send with the images
   * @returns Analysis text and token usage
   */
  async analyzeImages(
    imagesBase64: string[],
    prompt: string
  ): Promise<AnalysisResponse> {
    // Parse and validate all images
    const imageContents: Anthropic.ImageBlockParam[] = imagesBase64.map((imageBase64) => {
      const { base64Data, mediaType } = this.parseImageBase64(imageBase64);
      this.validateImageSize(base64Data);
      return {
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: mediaType,
          data: base64Data,
        },
      };
    });

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: MAX_TOKENS,
        messages: [
          {
            role: 'user',
            content: [
              ...imageContents,
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      });

      // Extract text from response
      const textBlock = response.content.find((block) => block.type === 'text');
      const text = textBlock && textBlock.type === 'text' ? textBlock.text : '';

      return {
        text,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Send a chat conversation to Claude
   * @param messages - Array of conversation messages
   * @param stream - Optional streaming flag (not implemented yet)
   * @returns Response content and token usage
   */
  async chat(messages: Message[], stream?: boolean): Promise<ChatResponse> {
    if (stream) {
      throw new ModelError(
        'Streaming is not implemented yet',
        'anthropic',
        undefined,
        false
      );
    }

    // Extract system message if present
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    // Convert to Anthropic message format
    const anthropicMessages: Anthropic.MessageParam[] = conversationMessages.map(
      (m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })
    );

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: MAX_TOKENS,
        system: systemMessage?.content,
        messages: anthropicMessages,
      });

      // Extract text from response
      const textBlock = response.content.find((block) => block.type === 'text');
      const content = textBlock && textBlock.type === 'text' ? textBlock.text : '';

      return {
        content,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Parse a base64 image string, extracting the data and media type
   * @param dataUrl - Base64 string, optionally with data URL prefix
   * @returns Object with base64Data and mediaType
   */
  private parseImageBase64(dataUrl: string): {
    base64Data: string;
    mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  } {
    // Check if it's a data URL
    const dataUrlMatch = dataUrl.match(
      /^data:(image\/(jpeg|png|gif|webp));base64,(.+)$/
    );

    if (dataUrlMatch) {
      const mimeType = dataUrlMatch[1] as
        | 'image/jpeg'
        | 'image/png'
        | 'image/gif'
        | 'image/webp';
      return {
        base64Data: dataUrlMatch[3],
        mediaType: mimeType,
      };
    }

    // If no data URL prefix, assume it's raw base64 JPEG
    // Try to detect format from base64 magic bytes
    const mediaType = this.detectImageType(dataUrl);

    return {
      base64Data: dataUrl,
      mediaType,
    };
  }

  /**
   * Detect image type from base64 data
   * @param base64 - Raw base64 string
   * @returns Detected media type
   */
  private detectImageType(
    base64: string
  ): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
    // Decode first few bytes to check magic numbers
    const prefix = base64.substring(0, 20);

    // PNG: starts with iVBORw
    if (prefix.startsWith('iVBORw')) {
      return 'image/png';
    }

    // JPEG: starts with /9j/
    if (prefix.startsWith('/9j/')) {
      return 'image/jpeg';
    }

    // GIF: starts with R0lGOD
    if (prefix.startsWith('R0lGOD')) {
      return 'image/gif';
    }

    // WebP: starts with UklGR
    if (prefix.startsWith('UklGR')) {
      return 'image/webp';
    }

    // Default to JPEG
    return 'image/jpeg';
  }

  /**
   * Validate that an image doesn't exceed size limits
   * @param base64 - Base64 encoded image data
   * @throws ModelError if image is too large
   */
  private validateImageSize(base64: string): void {
    // Base64 is ~4/3 the size of the original binary
    const estimatedBytes = Math.ceil((base64.length * 3) / 4);

    if (estimatedBytes > MAX_IMAGE_SIZE_BYTES) {
      const sizeMB = (estimatedBytes / (1024 * 1024)).toFixed(1);
      throw new ModelError(
        `Image size (${sizeMB}MB) exceeds maximum allowed size of 5MB`,
        'anthropic',
        400,
        false
      );
    }
  }

  /**
   * Handle errors from the Anthropic SDK
   * @param error - Error from SDK
   * @returns Appropriate ModelError or RateLimitError
   */
  private handleError(error: unknown): ModelError {
    if (error instanceof Anthropic.APIError) {
      // Rate limit error
      if (error.status === 429) {
        const retryAfter = error.headers?.['retry-after'];
        const retryAfterMs = retryAfter ? parseInt(retryAfter) * 1000 : undefined;
        return new RateLimitError('anthropic', retryAfterMs);
      }

      // Authentication error
      if (error.status === 401) {
        return new ModelError(
          'Invalid Anthropic API key',
          'anthropic',
          401,
          false
        );
      }

      // Bad request
      if (error.status === 400) {
        return new ModelError(
          `Invalid request: ${error.message}`,
          'anthropic',
          400,
          false
        );
      }

      // Server error (retryable)
      if (error.status && error.status >= 500) {
        return new ModelError(
          `Anthropic server error: ${error.message}`,
          'anthropic',
          error.status,
          true
        );
      }

      // Generic API error
      return new ModelError(
        `Anthropic API error: ${error.message}`,
        'anthropic',
        error.status,
        false
      );
    }

    // Unknown error
    if (error instanceof Error) {
      return new ModelError(
        `Unexpected error: ${error.message}`,
        'anthropic',
        undefined,
        false
      );
    }

    return new ModelError(
      'An unknown error occurred',
      'anthropic',
      undefined,
      false
    );
  }
}

export default AnthropicClient;

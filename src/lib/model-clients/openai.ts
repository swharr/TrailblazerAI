// lib/model-clients/openai.ts

import OpenAI from 'openai';
import { Message, ModelConfig } from '../types';
import {
  ModelProvider,
  AnalysisResponse,
  ChatResponse,
  ModelError,
  RateLimitError,
} from './base';

/** Default model to use */
const DEFAULT_MODEL = 'gpt-4o';

/** Maximum tokens for responses */
const MAX_TOKENS = 4096;

/**
 * OpenAI GPT API client implementing the ModelProvider interface.
 * Provides image analysis and chat capabilities using GPT-4 Vision models.
 */
export class OpenAIClient implements ModelProvider {
  private client: OpenAI;
  private model: string;

  /**
   * Create a new OpenAIClient
   * @param apiKey - Optional API key (defaults to OPENAI_API_KEY env var)
   * @param model - Optional model override
   * @throws ModelError if no API key is provided or found
   */
  constructor(apiKey?: string, model?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY;

    if (!key) {
      throw new ModelError(
        'OpenAI API key is required. Set OPENAI_API_KEY environment variable or pass apiKey to constructor.',
        'openai'
      );
    }

    this.client = new OpenAI({ apiKey: key });
    this.model = model || DEFAULT_MODEL;
  }

  /**
   * Get configuration information about this model
   */
  getModelInfo(): ModelConfig {
    return {
      provider: 'openai',
      name: this.model,
      displayName: 'GPT-4o',
      supportsVision: true,
      costPer1kInputTokens: 0.0025, // $2.50 per 1M
      costPer1kOutputTokens: 0.01, // $10 per 1M
    };
  }

  /**
   * Analyze an image using GPT-4 Vision
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
   * Analyze multiple images using GPT-4 Vision
   * @param imagesBase64 - Array of base64 encoded image data
   * @param prompt - The analysis prompt to send with the images
   * @returns Analysis text and token usage
   */
  async analyzeImages(
    imagesBase64: string[],
    prompt: string
  ): Promise<AnalysisResponse> {
    // Build content array with images and text
    const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

    for (const imageBase64 of imagesBase64) {
      const dataUrl = this.ensureDataUrl(imageBase64);
      content.push({
        type: 'image_url',
        image_url: {
          url: dataUrl,
          detail: 'high',
        },
      });
    }

    content.push({
      type: 'text',
      text: prompt,
    });

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: MAX_TOKENS,
        messages: [
          {
            role: 'user',
            content,
          },
        ],
      });

      const text = response.choices[0]?.message?.content || '';

      return {
        text,
        usage: {
          inputTokens: response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.completion_tokens || 0,
        },
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Send a chat conversation to GPT
   * @param messages - Array of conversation messages
   * @param stream - Optional streaming flag (not implemented yet)
   * @returns Response content and token usage
   */
  async chat(messages: Message[], stream?: boolean): Promise<ChatResponse> {
    if (stream) {
      throw new ModelError(
        'Streaming is not implemented yet',
        'openai',
        undefined,
        false
      );
    }

    // Convert to OpenAI message format
    const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
      messages.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      }));

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: MAX_TOKENS,
        messages: openaiMessages,
      });

      const content = response.choices[0]?.message?.content || '';

      return {
        content,
        usage: {
          inputTokens: response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.completion_tokens || 0,
        },
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Ensure the image has a proper data URL prefix
   */
  private ensureDataUrl(imageBase64: string): string {
    if (imageBase64.startsWith('data:')) {
      return imageBase64;
    }

    // Detect type and add prefix
    const mediaType = this.detectImageType(imageBase64);
    return `data:${mediaType};base64,${imageBase64}`;
  }

  /**
   * Detect image type from base64 data
   */
  private detectImageType(base64: string): string {
    const prefix = base64.substring(0, 30);

    if (prefix.startsWith('iVBORw')) return 'image/png';
    if (prefix.startsWith('/9j/')) return 'image/jpeg';
    if (prefix.startsWith('R0lGOD')) return 'image/gif';
    if (prefix.startsWith('UklGR')) return 'image/webp';

    return 'image/jpeg';
  }

  /**
   * Handle errors from the OpenAI SDK
   */
  private handleError(error: unknown): ModelError {
    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        return new RateLimitError('openai');
      }

      if (error.status === 401) {
        return new ModelError('Invalid OpenAI API key', 'openai', 401, false);
      }

      if (error.status === 400) {
        return new ModelError(
          `Invalid request: ${error.message}`,
          'openai',
          400,
          false
        );
      }

      if (error.status && error.status >= 500) {
        return new ModelError(
          `OpenAI server error: ${error.message}`,
          'openai',
          error.status,
          true
        );
      }

      return new ModelError(
        `OpenAI API error: ${error.message}`,
        'openai',
        error.status,
        false
      );
    }

    if (error instanceof Error) {
      return new ModelError(
        `Unexpected error: ${error.message}`,
        'openai',
        undefined,
        false
      );
    }

    return new ModelError('An unknown error occurred', 'openai', undefined, false);
  }
}

export default OpenAIClient;

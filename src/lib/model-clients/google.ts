// lib/model-clients/google.ts

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { Message, ModelConfig } from '../types';
import {
  ModelProvider,
  AnalysisResponse,
  ChatResponse,
  ModelError,
  RateLimitError,
} from './base';

/** Default model to use */
const DEFAULT_MODEL = 'gemini-2.0-flash';

/** Maximum tokens for responses */
const MAX_TOKENS = 4096;

/**
 * Google Gemini API client implementing the ModelProvider interface.
 * Provides image analysis and chat capabilities using Gemini models.
 */
export class GoogleClient implements ModelProvider {
  private client: GoogleGenerativeAI;
  private model: string;

  /**
   * Create a new GoogleClient
   * @param apiKey - Optional API key (defaults to GOOGLE_AI_API_KEY env var)
   * @param model - Optional model override
   * @throws ModelError if no API key is provided or found
   */
  constructor(apiKey?: string, model?: string) {
    const key = apiKey || process.env.GOOGLE_AI_API_KEY;

    if (!key) {
      throw new ModelError(
        'Google AI API key is required. Set GOOGLE_AI_API_KEY environment variable or pass apiKey to constructor.',
        'google'
      );
    }

    this.client = new GoogleGenerativeAI(key);
    this.model = model || DEFAULT_MODEL;
  }

  /**
   * Get configuration information about this model
   */
  getModelInfo(): ModelConfig {
    return {
      provider: 'google',
      name: this.model,
      displayName: 'Gemini 2.0 Flash',
      supportsVision: true,
      costPer1kInputTokens: 0.0001, // Very low cost
      costPer1kOutputTokens: 0.0004,
    };
  }

  /**
   * Analyze an image using Gemini Vision
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
   * Analyze multiple images using Gemini Vision
   * @param imagesBase64 - Array of base64 encoded image data
   * @param prompt - The analysis prompt to send with the images
   * @returns Analysis text and token usage
   */
  async analyzeImages(
    imagesBase64: string[],
    prompt: string
  ): Promise<AnalysisResponse> {
    try {
      const generativeModel = this.client.getGenerativeModel({
        model: this.model,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
        ],
        generationConfig: {
          maxOutputTokens: MAX_TOKENS,
        },
      });

      // Build content parts with images
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

      for (const imageBase64 of imagesBase64) {
        const { data, mimeType } = this.parseImageBase64(imageBase64);
        parts.push({
          inlineData: {
            mimeType,
            data,
          },
        });
      }

      parts.push({ text: prompt });

      const result = await generativeModel.generateContent(parts);
      const response = result.response;
      const text = response.text();

      // Gemini doesn't provide detailed token counts in all responses
      const usageMetadata = response.usageMetadata;

      return {
        text,
        usage: {
          inputTokens: usageMetadata?.promptTokenCount || 0,
          outputTokens: usageMetadata?.candidatesTokenCount || 0,
        },
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Send a chat conversation to Gemini
   * @param messages - Array of conversation messages
   * @param stream - Optional streaming flag (not implemented yet)
   * @returns Response content and token usage
   */
  async chat(messages: Message[], stream?: boolean): Promise<ChatResponse> {
    if (stream) {
      throw new ModelError(
        'Streaming is not implemented yet',
        'google',
        undefined,
        false
      );
    }

    try {
      const generativeModel = this.client.getGenerativeModel({
        model: this.model,
        generationConfig: {
          maxOutputTokens: MAX_TOKENS,
        },
      });

      // Extract system message if present
      const systemMessage = messages.find((m) => m.role === 'system');
      const conversationMessages = messages.filter((m) => m.role !== 'system');

      // Build chat history
      const history = conversationMessages.slice(0, -1).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const chat = generativeModel.startChat({
        history: history as Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
        systemInstruction: systemMessage?.content,
      });

      // Send the last message
      const lastMessage = conversationMessages[conversationMessages.length - 1];
      const result = await chat.sendMessage(lastMessage?.content || '');
      const response = result.response;
      const content = response.text();

      const usageMetadata = response.usageMetadata;

      return {
        content,
        usage: {
          inputTokens: usageMetadata?.promptTokenCount || 0,
          outputTokens: usageMetadata?.candidatesTokenCount || 0,
        },
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Parse a base64 image string, extracting the data and media type
   */
  private parseImageBase64(dataUrl: string): { data: string; mimeType: string } {
    const dataUrlMatch = dataUrl.match(
      /^data:(image\/(jpeg|png|gif|webp));base64,(.+)$/
    );

    if (dataUrlMatch) {
      return {
        mimeType: dataUrlMatch[1],
        data: dataUrlMatch[3],
      };
    }

    // If no prefix, detect type
    const mimeType = this.detectImageType(dataUrl);
    return {
      data: dataUrl,
      mimeType,
    };
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
   * Handle errors from the Google SDK
   */
  private handleError(error: unknown): ModelError {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes('429') || message.includes('rate limit')) {
        return new RateLimitError('google');
      }

      if (message.includes('401') || message.includes('api key')) {
        return new ModelError('Invalid Google AI API key', 'google', 401, false);
      }

      if (message.includes('400') || message.includes('invalid')) {
        return new ModelError(
          `Invalid request: ${error.message}`,
          'google',
          400,
          false
        );
      }

      return new ModelError(
        `Google AI error: ${error.message}`,
        'google',
        undefined,
        false
      );
    }

    return new ModelError('An unknown error occurred', 'google', undefined, false);
  }
}

export default GoogleClient;

// lib/model-clients/bedrock.ts

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { Message, ModelConfig } from '../types';
import {
  ModelProvider,
  AnalysisResponse,
  ChatResponse,
  ModelError,
  RateLimitError,
} from './base';

/** Default model to use (Claude 3.5 Sonnet on Bedrock) */
const DEFAULT_MODEL = 'anthropic.claude-3-5-sonnet-20241022-v2:0';

/** Maximum tokens for responses */
const MAX_TOKENS = 4096;

/**
 * AWS Bedrock API client implementing the ModelProvider interface.
 * Provides access to Claude and other models via AWS Bedrock.
 */
export class BedrockClient implements ModelProvider {
  private client: BedrockRuntimeClient;
  private model: string;

  /**
   * Create a new BedrockClient
   * @param accessKeyId - Optional AWS access key (defaults to env var)
   * @param secretAccessKey - Optional AWS secret key (defaults to env var)
   * @param region - Optional AWS region (defaults to env var or us-west-2)
   * @param model - Optional model override
   * @throws ModelError if no credentials are provided or found
   */
  constructor(
    accessKeyId?: string,
    secretAccessKey?: string,
    region?: string,
    model?: string
  ) {
    const awsAccessKeyId = accessKeyId || process.env.AWS_ACCESS_KEY_ID;
    const awsSecretAccessKey = secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY;
    const awsRegion = region || process.env.AWS_BEDROCK_REGION || 'us-west-2';

    if (!awsAccessKeyId || !awsSecretAccessKey) {
      throw new ModelError(
        'AWS credentials are required. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.',
        'bedrock'
      );
    }

    this.client = new BedrockRuntimeClient({
      region: awsRegion,
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      },
    });
    this.model = model || DEFAULT_MODEL;
  }

  /**
   * Get configuration information about this model
   */
  getModelInfo(): ModelConfig {
    return {
      provider: 'bedrock',
      name: this.model,
      displayName: 'Claude 3.5 Sonnet (Bedrock)',
      supportsVision: true,
      costPer1kInputTokens: 0.003, // Similar to direct Anthropic
      costPer1kOutputTokens: 0.015,
    };
  }

  /**
   * Analyze an image using Claude on Bedrock
   * @param imageBase64 - Base64 encoded image data
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
   * Analyze multiple images using Claude on Bedrock
   * @param imagesBase64 - Array of base64 encoded image data
   * @param prompt - The analysis prompt to send with the images
   * @returns Analysis text and token usage
   */
  async analyzeImages(
    imagesBase64: string[],
    prompt: string
  ): Promise<AnalysisResponse> {
    // Build content array for Claude Messages API format
    const content: Array<
      | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
      | { type: 'text'; text: string }
    > = [];

    for (const imageBase64 of imagesBase64) {
      const { data, mediaType } = this.parseImageBase64(imageBase64);
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data,
        },
      });
    }

    content.push({
      type: 'text',
      text: prompt,
    });

    // Bedrock uses the Anthropic Messages API format
    const requestBody = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: 'user',
          content,
        },
      ],
    };

    try {
      const command = new InvokeModelCommand({
        modelId: this.model,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody),
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      const text = responseBody.content?.[0]?.text || '';

      return {
        text,
        usage: {
          inputTokens: responseBody.usage?.input_tokens || 0,
          outputTokens: responseBody.usage?.output_tokens || 0,
        },
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Send a chat conversation to Claude on Bedrock
   * @param messages - Array of conversation messages
   * @param stream - Optional streaming flag (not implemented yet)
   * @returns Response content and token usage
   */
  async chat(messages: Message[], stream?: boolean): Promise<ChatResponse> {
    if (stream) {
      throw new ModelError(
        'Streaming is not implemented yet',
        'bedrock',
        undefined,
        false
      );
    }

    // Extract system message if present
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    // Convert to Bedrock/Anthropic format
    const bedrockMessages = conversationMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const requestBody: {
      anthropic_version: string;
      max_tokens: number;
      messages: Array<{ role: string; content: string }>;
      system?: string;
    } = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: MAX_TOKENS,
      messages: bedrockMessages,
    };

    if (systemMessage) {
      requestBody.system = systemMessage.content;
    }

    try {
      const command = new InvokeModelCommand({
        modelId: this.model,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody),
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      const content = responseBody.content?.[0]?.text || '';

      return {
        content,
        usage: {
          inputTokens: responseBody.usage?.input_tokens || 0,
          outputTokens: responseBody.usage?.output_tokens || 0,
        },
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Parse a base64 image string, extracting the data and media type
   */
  private parseImageBase64(dataUrl: string): { data: string; mediaType: string } {
    const dataUrlMatch = dataUrl.match(
      /^data:(image\/(jpeg|png|gif|webp));base64,(.+)$/
    );

    if (dataUrlMatch) {
      return {
        mediaType: dataUrlMatch[1],
        data: dataUrlMatch[3],
      };
    }

    const mediaType = this.detectImageType(dataUrl);
    return {
      data: dataUrl,
      mediaType,
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
   * Handle errors from the Bedrock SDK
   */
  private handleError(error: unknown): ModelError {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      const name = error.name;

      if (name === 'ThrottlingException' || message.includes('throttl')) {
        return new RateLimitError('bedrock');
      }

      if (
        name === 'AccessDeniedException' ||
        message.includes('access denied') ||
        message.includes('not authorized')
      ) {
        return new ModelError(
          'Invalid AWS credentials or insufficient permissions',
          'bedrock',
          403,
          false
        );
      }

      if (name === 'ValidationException' || message.includes('validation')) {
        return new ModelError(
          `Invalid request: ${error.message}`,
          'bedrock',
          400,
          false
        );
      }

      if (name === 'ServiceException' || message.includes('service')) {
        return new ModelError(
          `Bedrock service error: ${error.message}`,
          'bedrock',
          500,
          true
        );
      }

      return new ModelError(
        `Bedrock error: ${error.message}`,
        'bedrock',
        undefined,
        false
      );
    }

    return new ModelError('An unknown error occurred', 'bedrock', undefined, false);
  }
}

export default BedrockClient;

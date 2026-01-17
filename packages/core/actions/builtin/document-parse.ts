/**
 * document.parse Action
 *
 * Parse free-text order messages using NairobiChaosParser.
 */

import { defineAction, success, failure, objectSchema, stringProp, numberProp } from '../helpers';
import { createParser } from '../../chaos-parser';

export const documentParseAction = defineAction({
  id: 'document.parse',
  category: 'document',
  description: 'Parse free-text messages into structured order data',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      text: stringProp('Raw message text to parse'),
      mode: stringProp('Parsing mode (optional, e.g. retail/restaurant/parts)'),
      confidenceThreshold: numberProp('Minimum confidence required', { minimum: 0, maximum: 1 }),
      businessConfig: {
        type: 'object',
        description: 'Optional business-specific parser config',
        properties: {},
      },
    },
    ['text'],
    'Input for document.parse action'
  ),

  outputSchema: objectSchema({
    success: { type: 'boolean', description: 'Whether parsing met confidence threshold' },
    type: { type: 'string', description: 'Parsed type (order/payment/inquiry/status)' },
    confidence: { type: 'number', description: 'Parser confidence score' },
    data: { type: 'object', description: 'Parsed payload' },
    language: { type: 'string', description: 'Detected language' },
  }),

  retryable: false,
  idempotent: true,

  async execute(input) {
    try {
      const text = input.text as string;
      const businessConfig = input.businessConfig as Record<string, unknown> | undefined;
      const threshold = (input.confidenceThreshold as number | undefined) ?? 0.6;

      const parser = createParser(businessConfig);
      const parsed = parser.parse(text);

      const isSuccess = parsed.confidence >= threshold;

      return success({
        success: isSuccess,
        type: parsed.type,
        confidence: parsed.confidence,
        data: parsed.data,
        language: parsed.language_detected ?? 'mixed',
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'DOCUMENT_PARSE_ERROR', shouldRetry: false }
      );
    }
  },
});

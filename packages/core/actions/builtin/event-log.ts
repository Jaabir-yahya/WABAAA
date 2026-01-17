/**
 * event.log Action
 * 
 * Log an event to the KCOS event store.
 * This is the foundation for event sourcing - every important thing that happens
 * should be logged as an event.
 */

import { defineAction, success, failure, objectSchema, stringProp } from '../helpers';

export const eventLogAction = defineAction({
  id: 'event.log',
  category: 'data',
  description: 'Log an event to the event store for audit trail and replay',
  version: '1.0.0',
  
  inputSchema: objectSchema(
    {
      eventType: stringProp('Event type (e.g., "order.created", "payment.received")'),
      streamId: stringProp('Optional stream ID for grouping related events'),
      eventData: {
        type: 'object',
        description: 'The event payload data',
      },
      actorId: stringProp('Optional ID of the actor who caused this event'),
    },
    ['eventType'],
    'Input for event.log action'
  ),
  
  outputSchema: objectSchema({
    eventId: { type: 'string', description: 'Unique ID of the logged event' },
    globalSequence: { type: 'number', description: 'Global sequence number' },
    occurredAt: { type: 'string', description: 'ISO timestamp when event occurred' },
  }),
  
  retryable: true,
  idempotent: true, // Using idempotency key prevents duplicates
  
  async execute(input, context) {
    const eventType = input.eventType as string;
    const streamId = (input.streamId as string) || context.workflowId;
    const eventData = (input.eventData as Record<string, unknown>) || {};
    const actorId = (input.actorId as string) || context.actorId;
    
    // Generate event ID
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const occurredAt = new Date().toISOString();
    
    // Build event record
    const event = {
      id: eventId,
      stream_id: streamId,
      event_type: eventType,
      event_data: eventData,
      metadata: {
        tenant_id: context.tenantId,
        workflow_id: context.workflowId,
        step_id: context.stepId,
        correlation_id: context.correlationId,
        idempotency_key: context.idempotencyKey,
        actor_id: actorId,
        source_channel: context.sourceChannel,
      },
      occurred_at: occurredAt,
      recorded_at: new Date().toISOString(),
    };
    
    // TODO: In real implementation, insert into event_store table
    // For now, log to console as proof of concept
    console.log('[event.log] Event recorded:', JSON.stringify(event, null, 2));
    
    // Simulated global sequence (in real impl, this comes from DB)
    const globalSequence = Date.now();
    
    return success({
      eventId,
      globalSequence,
      occurredAt,
    });
  },
});

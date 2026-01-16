/**
 * Event Processor
 * 
 * Processes commerce events and updates materialized views.
 * Handles event validation, deduplication, and business logic.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface CommerceEvent {
  business_id: string;
  event_type: string;
  event_subtype?: string;
  source_channel: string;
  source_id?: string;
  customer_phone?: string;
  customer_name?: string;
  payload: Record<string, any>;
  idempotency_key?: string;
}

export interface ProcessingResult {
  success: boolean;
  event_id?: string;
  error?: string;
  deduplicated?: boolean;
}

/**
 * Event Processor class
 */
export class EventProcessor {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Ingest a single event (with idempotency)
   */
  async ingest(event: CommerceEvent): Promise<ProcessingResult> {
    try {
      // Validate event
      const validation = this.validate(event);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Check for duplicate (idempotency)
      if (event.idempotency_key) {
        const { data: existing } = await this.supabase
          .from('commerce_events')
          .select('id')
          .eq('idempotency_key', event.idempotency_key)
          .single();

        if (existing) {
          return {
            success: true,
            event_id: existing.id,
            deduplicated: true
          };
        }
      }

      // Insert event
      const { data, error } = await this.supabase
        .from('commerce_events')
        .insert({
          ...event,
          occurred_at: new Date().toISOString(),
          processing_status: 'pending'
        })
        .select('id')
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Process event (async)
      this.processAsync(data.id).catch(err => {
        console.error('Background processing failed:', err);
      });

      return { success: true, event_id: data.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Ingest multiple events in batch
   */
  async ingestBatch(events: CommerceEvent[]): Promise<ProcessingResult[]> {
    // TODO: Optimize with bulk insert
    return Promise.all(events.map(event => this.ingest(event)));
  }

  /**
   * Validate event structure
   */
  private validate(event: CommerceEvent): { valid: boolean; error?: string } {
    if (!event.business_id) {
      return { valid: false, error: 'Missing business_id' };
    }

    if (!event.event_type) {
      return { valid: false, error: 'Missing event_type' };
    }

    if (!event.source_channel) {
      return { valid: false, error: 'Missing source_channel' };
    }

    if (!event.payload || typeof event.payload !== 'object') {
      return { valid: false, error: 'Invalid payload' };
    }

    return { valid: true };
  }

  /**
   * Process event asynchronously (update views, trigger actions)
   */
  private async processAsync(eventId: string): Promise<void> {
    try {
      // Mark as processing
      await this.supabase
        .from('commerce_events')
        .update({ processing_status: 'processing', processed_at: new Date().toISOString() })
        .eq('id', eventId);

      // Get event details
      const { data: event } = await this.supabase
        .from('commerce_events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (!event) throw new Error('Event not found');

      // Process based on event type
      await this.processEventType(event);

      // Mark as completed
      await this.supabase
        .from('commerce_events')
        .update({ processing_status: 'completed' })
        .eq('id', eventId);

      // Refresh views (could be optimized to only refresh relevant views)
      await this.refreshViews(event.business_id);
    } catch (error: any) {
      // Mark as failed
      await this.supabase
        .from('commerce_events')
        .update({
          processing_status: 'failed',
          processing_error: error.message
        })
        .eq('id', eventId);
    }
  }

  /**
   * Process specific event types
   */
  private async processEventType(event: any): Promise<void> {
    switch (event.event_type) {
      case 'order':
        await this.processOrderEvent(event);
        break;
      case 'payment':
        await this.processPaymentEvent(event);
        break;
      case 'message':
        await this.processMessageEvent(event);
        break;
      // Add more types as needed
    }
  }

  /**
   * Process order events
   */
  private async processOrderEvent(event: any): Promise<void> {
    // Order-specific logic (e.g., auto-link to payments, check inventory)
    if (event.event_subtype === 'created') {
      // Check for matching pending payment
      const order_id = event.payload.order_id;
      const amount = event.payload.total_amount;

      // Try to auto-link payment
      const { data: pendingPayments } = await this.supabase
        .from('payments_view')
        .select('*')
        .eq('business_id', event.business_id)
        .eq('customer_phone', event.customer_phone)
        .eq('amount', amount)
        .is('linked_order_id', null)
        .limit(1);

      if (pendingPayments && pendingPayments.length > 0) {
        // Link payment to order
        await this.ingest({
          business_id: event.business_id,
          event_type: 'payment',
          event_subtype: 'linked',
          source_channel: 'system',
          payload: {
            transaction_id: pendingPayments[0].transaction_id,
            linked_order_id: order_id
          },
          idempotency_key: `link:${pendingPayments[0].transaction_id}:${order_id}`
        });
      }
    }
  }

  /**
   * Process payment events
   */
  private async processPaymentEvent(event: any): Promise<void> {
    // Payment-specific logic (e.g., auto-link to orders)
    if (event.event_subtype === 'received') {
      const amount = event.payload.amount;
      const phone = event.customer_phone;

      // Try to find matching order
      const { data: pendingOrders } = await this.supabase
        .from('orders_view')
        .select('*')
        .eq('business_id', event.business_id)
        .eq('customer_phone', phone)
        .eq('total_amount', amount)
        .eq('status', 'pending_payment')
        .limit(1);

      if (pendingOrders && pendingOrders.length > 0) {
        // Update payment with linked order
        await this.ingest({
          business_id: event.business_id,
          event_type: 'payment',
          event_subtype: 'linked',
          source_channel: 'system',
          payload: {
            transaction_id: event.payload.transaction_id,
            linked_order_id: pendingOrders[0].order_id
          },
          idempotency_key: `link:${event.payload.transaction_id}:${pendingOrders[0].order_id}`
        });
      }
    }
  }

  /**
   * Process message events
   */
  private async processMessageEvent(event: any): Promise<void> {
    // Message-specific logic (e.g., parse into order, trigger auto-response)
    // This could trigger the NairobiChaosParser if it's an inbound message
  }

  /**
   * Refresh materialized views for a business
   */
  private async refreshViews(businessId: string): Promise<void> {
    try {
      await this.supabase.rpc('refresh_views_for_business', {
        p_business_id: businessId
      });
    } catch (error) {
      console.error('View refresh failed:', error);
      // Non-fatal, views will be refreshed on next cron
    }
  }

  /**
   * Get unprocessed events (for batch processing or retry)
   */
  async getUnprocessedEvents(businessId?: string, limit: number = 100): Promise<any[]> {
    let query = this.supabase
      .from('commerce_events')
      .select('*')
      .in('processing_status', ['pending', 'failed'])
      .order('occurred_at', { ascending: true })
      .limit(limit);

    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    const { data } = await query;
    return data || [];
  }

  /**
   * Retry failed event
   */
  async retryEvent(eventId: string): Promise<ProcessingResult> {
    try {
      await this.processAsync(eventId);
      return { success: true, event_id: eventId };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

/**
 * Factory function
 */
export function createEventProcessor(supabase: SupabaseClient): EventProcessor {
  return new EventProcessor(supabase);
}

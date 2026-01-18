/**
 * appointment.confirm Action
 *
 * Confirm an appointment booking.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { defineAction, success, failure, objectSchema, stringProp } from '../helpers';

let cachedSupabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (cachedSupabase) return cachedSupabase;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  cachedSupabase = createClient(url, serviceKey);
  return cachedSupabase;
}

export const appointmentConfirmAction = defineAction({
  id: 'appointment.confirm',
  category: 'scheduling',
  description: 'Confirm an appointment booking',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      appointmentId: stringProp('Appointment ID'),
    },
    ['appointmentId'],
    'Input for appointment.confirm action'
  ),

  outputSchema: objectSchema({
    id: { type: 'string', description: 'Appointment ID' },
    status: { type: 'string', description: 'Updated status' },
  }),

  retryable: true,
  idempotent: true,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const businessId = (input.businessId as string) || context.tenantId;

      const { data: appointment, error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', input.appointmentId)
        .eq('business_id', businessId)
        .select('*')
        .single();

      if (error) {
        return failure(`Failed to confirm appointment: ${error.message}`, {
          errorCode: 'APPOINTMENT_CONFIRM_FAILED',
          shouldRetry: true,
        });
      }

      return success({
        id: appointment.id,
        status: appointment.status,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'APPOINTMENT_ERROR', shouldRetry: true }
      );
    }
  },
});

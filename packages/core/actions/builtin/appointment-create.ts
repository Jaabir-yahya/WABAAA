/**
 * appointment.create Action
 *
 * Create an appointment booking.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  defineAction,
  success,
  failure,
  objectSchema,
  stringProp,
  numberProp,
} from '../helpers';

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

export const appointmentCreateAction = defineAction({
  id: 'appointment.create',
  category: 'scheduling',
  description: 'Create an appointment booking',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      orderId: stringProp('Order ID (optional)'),
      serviceId: stringProp('Service ID'),
      employeeId: stringProp('Employee ID (optional)'),
      customerPhone: stringProp('Customer phone'),
      customerName: stringProp('Customer name (optional)'),
      scheduledAt: stringProp('Scheduled datetime (ISO string)'),
      durationMins: numberProp('Duration in minutes', { minimum: 1 }),
      notes: stringProp('Notes (optional)'),
    },
    ['serviceId', 'customerPhone', 'scheduledAt', 'durationMins'],
    'Input for appointment.create action'
  ),

  outputSchema: objectSchema({
    id: { type: 'string', description: 'Appointment ID' },
    status: { type: 'string', description: 'Appointment status' },
    scheduledAt: { type: 'string', description: 'Scheduled datetime' },
  }),

  retryable: true,
  idempotent: false,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const businessId = (input.businessId as string) || context.tenantId;

      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          business_id: businessId,
          order_id: input.orderId ?? null,
          service_id: input.serviceId,
          employee_id: input.employeeId ?? null,
          customer_phone: input.customerPhone,
          customer_name: input.customerName ?? null,
          scheduled_at: input.scheduledAt,
          duration_mins: input.durationMins,
          status: 'scheduled',
          notes: input.notes ?? null,
        })
        .select('*')
        .single();

      if (error) {
        return failure(`Failed to create appointment: ${error.message}`, {
          errorCode: 'APPOINTMENT_CREATE_FAILED',
          shouldRetry: true,
        });
      }

      return success({
        id: appointment.id,
        status: appointment.status,
        scheduledAt: appointment.scheduled_at,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'APPOINTMENT_ERROR', shouldRetry: true }
      );
    }
  },
});

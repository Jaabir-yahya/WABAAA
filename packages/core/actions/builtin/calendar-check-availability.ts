/**
 * calendar.check_availability Action
 *
 * Check for appointment conflicts in a given time range.
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

export const calendarCheckAvailabilityAction = defineAction({
  id: 'calendar.check_availability',
  category: 'scheduling',
  description: 'Check calendar availability for a time range',
  version: '1.0.0',

  inputSchema: objectSchema(
    {
      businessId: stringProp('Business/tenant ID (optional, defaults to context.tenantId)'),
      employeeId: stringProp('Employee ID (optional)'),
      startAt: stringProp('Start datetime (ISO string)'),
      endAt: stringProp('End datetime (ISO string)'),
    },
    ['startAt', 'endAt'],
    'Input for calendar.check_availability action'
  ),

  outputSchema: objectSchema({
    available: { type: 'boolean', description: 'Whether the slot is available' },
    conflicts: {
      type: 'array',
      description: 'Conflicting appointments',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          scheduledAt: { type: 'string' },
          durationMins: { type: 'number' },
          status: { type: 'string' },
        },
      },
    },
  }),

  retryable: true,
  idempotent: true,

  async execute(input, context) {
    try {
      const supabase = getSupabaseClient();
      const businessId = (input.businessId as string) || context.tenantId;

      const query = supabase
        .from('appointments')
        .select('id,scheduled_at,duration_mins,status,employee_id')
        .eq('business_id', businessId)
        .not('status', 'eq', 'cancelled')
        .lt('scheduled_at', input.endAt)
        .gte('scheduled_at', input.startAt);

      if (input.employeeId) {
        query.eq('employee_id', input.employeeId);
      }

      const { data: conflicts, error } = await query;

      if (error) {
        return failure(`Failed to check availability: ${error.message}`, {
          errorCode: 'CALENDAR_AVAILABILITY_FAILED',
          shouldRetry: true,
        });
      }

      const mappedConflicts = (conflicts || []).map((appointment) => ({
        id: appointment.id,
        scheduledAt: appointment.scheduled_at,
        durationMins: appointment.duration_mins,
        status: appointment.status,
      }));

      return success({
        available: mappedConflicts.length === 0,
        conflicts: mappedConflicts,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : String(error),
        { errorCode: 'CALENDAR_ERROR', shouldRetry: true }
      );
    }
  },
});

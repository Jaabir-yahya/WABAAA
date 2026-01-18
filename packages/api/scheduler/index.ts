import cron, { ScheduledTask } from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import type { WorkflowDefinition, WorkflowTriggerInput } from '@kenya-commerce-os/core/workflows';
import { WorkflowEngine } from '@kenya-commerce-os/core/workflows';

export class WorkflowScheduler {
  private jobs: Map<string, ScheduledTask> = new Map();
  private engine: WorkflowEngine;

  constructor(engine: WorkflowEngine) {
    this.engine = engine;
  }

  registerWorkflow(definition: WorkflowDefinition) {
    if (definition.trigger?.type !== 'schedule.cron') return;

    const schedule = definition.trigger.schedule;
    if (!schedule || typeof schedule !== 'string') return;

    const job = cron.schedule(schedule, async () => {
      const supabase = createClient(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      );

      const { data: businesses, error } = await supabase
        .from('businesses')
        .select('id, config')
        .eq('status', 'active');

      if (error) {
        console.error(`[Scheduler] Failed to load businesses: ${error.message}`);
        return;
      }

      for (const business of businesses || []) {
        if (!shouldRunForBusiness(definition, business.config)) {
          continue;
        }

        const triggerInput: WorkflowTriggerInput = {
          type: 'schedule.cron',
          data: { businessId: business.id },
          metadata: { scheduledAt: new Date().toISOString() },
        };

        try {
          await this.engine.execute(definition, triggerInput, business.id);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[Scheduler] ${definition.id} failed for ${business.id}: ${message}`);
        }
      }
    });

    this.jobs.set(definition.id, job);
  }

  start() {
    this.jobs.forEach(job => job.start());
    console.log(`[Scheduler] Started ${this.jobs.size} scheduled workflows`);
  }

  stop() {
    this.jobs.forEach(job => job.stop());
    this.jobs.clear();
  }
}

function shouldRunForBusiness(definition: WorkflowDefinition, config: Record<string, unknown> | null) {
  if (!config) return true;

  const tags = definition.tags || [];
  const enableInventory = Boolean((config as Record<string, unknown>).enableInventory);
  const enableAppointments = Boolean((config as Record<string, unknown>).enableAppointments);
  const enableSupplierCredit = Boolean((config as Record<string, unknown>).enableSupplierCredit);
  const enableCommissions = Boolean((config as Record<string, unknown>).enableCommissions);

  if (tags.includes('inventory') && !enableInventory) return false;
  if (tags.includes('appointments') && !enableAppointments) return false;
  if (tags.includes('suppliers') && !enableSupplierCredit) return false;
  if (tags.includes('payroll') && !enableCommissions) return false;

  return true;
}

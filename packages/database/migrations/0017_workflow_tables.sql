-- Migration: Workflow definitions, instances, and events
-- Created: January 17, 2026
-- Description: Store workflow definitions and execution history

-- ============================================================================
-- WORKFLOW DEFINITIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id),

    workflow_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    version TEXT DEFAULT '1.0',

    definition JSONB NOT NULL,
    trigger_type TEXT NOT NULL,
    trigger_conditions JSONB,

    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(business_id, workflow_id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_definitions_business ON workflow_definitions(business_id);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_trigger ON workflow_definitions(trigger_type);

-- Enable RLS
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY workflow_definitions_isolation ON workflow_definitions
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true)::text);

-- ============================================================================
-- WORKFLOW INSTANCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES businesses(id),

    definition_id UUID REFERENCES workflow_definitions(id),
    workflow_id TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'running',
    -- running, completed, failed, compensating, cancelled

    trigger_data JSONB NOT NULL,
    variables JSONB DEFAULT '{}'::jsonb,

    current_step TEXT,
    error TEXT,

    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workflow_instances_business ON workflow_instances(business_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_started ON workflow_instances(started_at DESC);

-- Enable RLS
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY workflow_instances_isolation ON workflow_instances
    FOR ALL
    USING (business_id = current_setting('app.current_business_id', true)::text);

-- ============================================================================
-- WORKFLOW EVENTS (STEP HISTORY)
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES workflow_instances(id),

    step_id TEXT NOT NULL,
    action_id TEXT NOT NULL,
    attempt INTEGER DEFAULT 1,

    event_type TEXT NOT NULL,
    -- step.started, step.completed, step.failed, step.retrying, step.compensated

    input JSONB,
    output JSONB,
    error TEXT,
    error_code TEXT,

    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_events_instance ON workflow_events(instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_events_step ON workflow_events(instance_id, step_id);

-- Enable RLS
ALTER TABLE workflow_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY workflow_events_isolation ON workflow_events
    FOR ALL
    USING (instance_id IN (
        SELECT id FROM workflow_instances
        WHERE business_id = current_setting('app.current_business_id', true)::text
    ));

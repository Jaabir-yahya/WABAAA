import { Request } from 'express';
import { ActionContext } from '@kenya-commerce-os/core/actions';

export function buildActionContext(req: Request, actionId: string): ActionContext {
  const tenantId =
    (req as Request & { tenantId?: string }).tenantId ||
    (req.headers['x-tenant-id'] as string) ||
    'default-tenant';
  const correlationId =
    (req.headers['x-correlation-id'] as string) || `api-${Date.now()}`;
  const idempotencyKey =
    (req.headers['idempotency-key'] as string) || `${actionId}:${Date.now()}`;

  return {
    tenantId,
    workflowId: 'api',
    stepId: actionId,
    correlationId,
    variables: {},
    idempotencyKey,
    workflowStartedAt: new Date(),
    attemptNumber: 1,
    sourceChannel: 'api',
  };
}

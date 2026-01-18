import { createRegistry, registerBuiltinActions } from '../../actions';
import { WorkflowEngine, loadWorkflowDefinitionFromObject } from '..';

describe('Workflow conditional execution', () => {
  test('skips steps when condition is false', async () => {
    const registry = createRegistry();
    registerBuiltinActions(registry);

    const engine = new WorkflowEngine({ actionRegistry: registry });
    const def = loadWorkflowDefinitionFromObject({
      id: 'test.conditional.false',
      name: 'Conditional false',
      version: '1.0.0',
      trigger: { type: 'manual.trigger' },
      steps: [
        {
          id: 'set_flags',
          action: 'data.transform',
          input: {
            mapping: { enabled: false },
          },
          output: 'flags',
        },
        {
          id: 'conditional_step',
          action: 'debug.log',
          when: '{{ flags.transformed.enabled }}',
          input: { message: 'Should not run' },
        },
      ],
    });

    const result = await engine.execute(def, { type: 'manual.trigger', data: {} }, 'tenant-1');
    expect(result.steps.conditional_step?.status).toBe('skipped');
  });

  test('executes steps when condition is true', async () => {
    const registry = createRegistry();
    registerBuiltinActions(registry);

    const engine = new WorkflowEngine({ actionRegistry: registry });
    const def = loadWorkflowDefinitionFromObject({
      id: 'test.conditional.true',
      name: 'Conditional true',
      version: '1.0.0',
      trigger: { type: 'manual.trigger' },
      steps: [
        {
          id: 'set_flags',
          action: 'data.transform',
          input: {
            mapping: { enabled: true },
          },
          output: 'flags',
        },
        {
          id: 'conditional_step',
          action: 'debug.log',
          when: '{{ flags.transformed.enabled }}',
          input: { message: 'Should run' },
        },
      ],
    });

    const result = await engine.execute(def, { type: 'manual.trigger', data: {} }, 'tenant-1');
    expect(result.steps.conditional_step?.status).toBe('completed');
  });
});

import { PREVIEW_INITIAL_MODEL } from './preview-form.definition';
import { createPreviewValidationSuite } from './preview-form.validation';

/** The suite is written for the sample form, and has to run on any form the structure editor builds. */
describe('preview validation suite', () => {
  function issues(model: Record<string, unknown>): { message?: string; path?: readonly unknown[] }[] {
    const result = createPreviewValidationSuite()['~standard'].validate(model);

    return result instanceof Promise ? [] : [...(result.issues ?? [])];
  }

  it('reports on the sample form’s own targets, the groups and the whole form among them', () => {
    const reported = issues({
      ...PREVIEW_INITIAL_MODEL,
      sauce: 'bbq',
      toppings: ['pineapple'],
      orderName: '',
      // A Monday, which is the group rule's to report.
      when: { date: new Date(2026, 8, 28), time: new Date(2000, 0, 1, 19, 30) }
    }).map((issue) => issue.path?.join('.'));

    // The branch is empty in the sample and required, and reported: leaving a hidden field out is Signal
    // Forms' job, not the suite's.
    expect(reported).toEqual(['orderName', 'branch', 'when', 'wholeForm']);
  });

  it('drops an issue whose target runs through a key the model does not have', () => {
    const { payment: _payment, when: _when, ...ungrouped } = PREVIEW_INITIAL_MODEL;
    const reported = issues({ ...ungrouped, orderName: '' }).map((issue) => issue.path?.join('.'));

    expect(reported).toContain('orderName');
    expect(reported.some((path) => path?.startsWith('payment.'))).toBeFalse();
  });
});

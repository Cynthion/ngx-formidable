import { WHOLE_FORM } from '@cynthion/ngx-formidable';
import { create, enforce, mode, Modes, omitWhen, only, Suite, test } from 'vest';

/** The preview form's model. Keys are field ids, so the shape is derived from the definition, never declared. */
type PreviewModel = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function list(value: unknown): readonly string[] {
  return Array.isArray(value) ? (value as string[]) : [];
}

function date(value: unknown): Date | null {
  return value instanceof Date ? value : null;
}

/**
 * The Vest suite behind the preview form. Rules are written against the field ids in
 * `preview-form.definition.ts`; a renamed field is a rule that stops matching, which the model drawer shows.
 */
export const previewValidationSuite: Suite<string, string, (model: PreviewModel, field?: string) => void> = create(
  (model: PreviewModel, field?: string) => {
    mode(Modes.ALL);

    if (field) {
      only(field);
    }

    test('travellerName', 'A name is required.', () => {
      enforce(text(model['travellerName'])).isNotBlank();
    });

    test('temporalId', 'A temporal identifier is required.', () => {
      enforce(text(model['temporalId'])).isNotBlank();
    });

    test('temporalId', 'A temporal identifier reads AAA-0000.', () => {
      enforce(text(model['temporalId'])).matches(/^[A-Za-z]{3}-\d{4}$/);
    });

    test('originEra', 'State the era you are travelling from.', () => {
      enforce(text(model['originEra'])).isNotBlank();
    });

    test('destinationEra', 'State the era you are travelling to.', () => {
      enforce(text(model['destinationEra'])).isNotBlank();
    });

    test('purpose', 'A purpose of visit is required.', () => {
      enforce(text(model['purpose'])).isNotBlank();
    });

    test('declarations', 'Both mandatory declarations are required.', () => {
      const declared = list(model['declarations']);
      enforce(declared.includes('no-lottery') && declared.includes('no-tech')).isTruthy();
    });

    test('companions', 'Eight companions is the cabin limit.', () => {
      enforce(typeof model['companions'] === 'number' ? model['companions'] : 0).lessThanOrEquals(8);
    });

    // Only checked once both dates are present — a half-filled pair is not yet wrong.
    omitWhen(!date(model['arrivalDate']) || !date(model['returnDate']), () => {
      test('returnDate', 'You cannot return before you arrive.', () => {
        enforce(date(model['returnDate'])!.getTime()).greaterThanOrEquals(date(model['arrivalDate'])!.getTime());
      });
    });

    // A whole-form rule: it reads two fields and reports on neither of them.
    test(WHOLE_FORM, 'Meeting yourself requires total paradox tolerance.', () => {
      const met = model['metYourself'] === true;
      const tolerance = typeof model['paradoxTolerance'] === 'number' ? model['paradoxTolerance'] : 0;
      enforce(met && tolerance < 100).isFalsy();
    });
  }
);

/** The rules the `angular` validator mode wires with Angular's own validators instead of a suite. */
export const ANGULAR_REQUIRED_FIELDS: ReadonlySet<string> = new Set([
  'travellerName',
  'temporalId',
  'originEra',
  'destinationEra',
  'purpose'
]);

/** Minimum lengths for the `angular` validator mode, keyed by field id. */
export const ANGULAR_MIN_LENGTHS: ReadonlyMap<string, number> = new Map([['temporalId', 8]]);

/** Targets whose rules read another field, so the form re-validates them when that field moves. */
export const PREVIEW_DEPENDENT_FIELDS: Readonly<Record<string, string[]>> = {
  arrivalDate: ['returnDate']
};

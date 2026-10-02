import { create, enforce, mode, Modes, omitWhen, test } from 'vest';
// A namespace import, as Zod's own docs write it: unlike `{ z }`, it leaves what goes unused to tree shaking.
import * as z from 'zod';
import { pathOf, readPath } from '../helpers/model-path.helpers';
import { FIELD_KIND_VALUE_TYPES, PortalValueType } from './field-capabilities';
import { PREVIEW_FORM_DEFINITION } from './preview-form.definition';

/** The preview form's model. Keys are field ids, so its type is derived from the definition, never declared. */
type PreviewModel = Record<string, unknown>;

/** The sample's model, as far as a check across fields reads it. Such a check runs only with its fields there. */
export interface SampleModel {
  readonly sauce: string | null;
  readonly toppings: readonly string[];
  readonly when: { readonly date: Date | null; readonly time: Date | null };
}

/** What a rule checks: one field's value, or — `cross` — several fields, reporting on a group or the form. */
type PortalCheck =
  | { readonly kind: 'required' }
  | { readonly kind: 'pattern'; readonly pattern: RegExp }
  | { readonly kind: 'maxItems'; readonly max: number }
  | {
      readonly kind: 'cross';
      /** The error's `kind` under Angular's rules. */
      readonly name: string;
      /** The model paths it reads, which must all be on the form. */
      readonly reads: readonly string[];
      /** Passes while the model is fine. */
      readonly test: (model: SampleModel) => boolean;
      /** `test` as the export writes it: an expression over `model`, typed as the exported model. */
      readonly source: string;
    };

/** One rule of the sample: where it reports, what it says, and what it checks. */
export interface PortalRule {
  /** A field's model path, a group's name, or `''` for the whole form. */
  readonly target: string;
  readonly message: string;
  readonly check: PortalCheck;
}

const requiredRule = (target: string, message: string): PortalRule => ({
  target,
  message,
  check: { kind: 'required' }
});

const patternRule = (target: string, message: string, regex: RegExp): PortalRule => ({
  target,
  message,
  check: { kind: 'pattern', pattern: regex }
});

/**
 * The sample form's rules, stated once: each validator spells them in its own terms, on the stage here and in
 * the export in `schema-serializer.ts`. Field checks come in form order, the checks across fields last.
 *
 * A format check says nothing about an empty value, which is the required check's to report.
 */
const PREVIEW_RULES: readonly PortalRule[] = [
  requiredRule('pizza', 'Pick a pizza to start from.'),
  requiredRule('size', 'Pick a size.'),
  requiredRule('crust', 'Pick a crust.'),
  requiredRule('sauce', 'Pick a sauce.'),
  { target: 'toppings', message: 'Five toppings is the limit.', check: { kind: 'maxItems', max: 5 } },
  requiredRule('address', 'We need an address to deliver to.'),
  requiredRule('branch', 'Pick a branch to collect from.'),
  requiredRule('payment.method', 'Choose how to pay.'),
  requiredRule('payment.cardNumber', 'A card number is required.'),
  patternRule('payment.cardNumber', 'A card number is sixteen digits.', /^\d{4} \d{4} \d{4} \d{4}$/),
  requiredRule('orderName', 'We need a name for the order.'),
  requiredRule('phone', 'A phone number is required.'),
  patternRule('phone', 'A phone number reads 079 123 45 67.', /^\d{3} \d{3} \d{2} \d{2}$/),
  requiredRule('email', 'An email address is required.'),
  patternRule('email', 'That does not look like an email address.', /^[^@\s]+@[^@\s.]+\.[^@\s]+$/),
  // Two group rules. Each reads a member of `when` and reports on the group, because neither the date nor the
  // time is wrong on its own — being shut is a fact about the pair.
  {
    target: 'when',
    message: 'We are open from 11:00 to 23:00.',
    check: {
      kind: 'cross',
      name: 'openingHours',
      reads: ['when.time'],
      test: (model) => !model.when.time || (model.when.time.getHours() >= 11 && model.when.time.getHours() < 23),
      source: '!model.when.time || (model.when.time.getHours() >= 11 && model.when.time.getHours() < 23)'
    }
  },
  {
    target: 'when',
    message: 'We are closed on Mondays.',
    check: {
      kind: 'cross',
      name: 'closedOnMondays',
      reads: ['when.date'],
      test: (model) => model.when.date?.getDay() !== 1,
      source: 'model.when.date?.getDay() !== 1'
    }
  },
  // A whole-form rule: it reads two fields and reports on neither of them.
  {
    target: '',
    message: 'Pineapple on a BBQ base is a combination this kitchen refuses.',
    check: {
      kind: 'cross',
      name: 'pineappleOnBbq',
      reads: ['sauce', 'toppings'],
      test: (model) => !(model.sauce === 'bbq' && model.toppings.includes('pineapple')),
      source: "!(model.sauce === 'bbq' && model.toppings.includes('pineapple'))"
    }
  }
];

/** The model paths a rule needs on the form: the field it checks, or every field a check across fields reads. */
export function fieldsOf(rule: PortalRule): readonly string[] {
  return rule.check.kind === 'cross' ? rule.check.reads : [rule.target];
}

/** What each field of the sample writes, by model path. Derived from the definition, so it cannot drift from it. */
const SAMPLE_TYPES: ReadonlyMap<string, PortalValueType> = new Map(
  PREVIEW_FORM_DEFINITION.fields.map((field) => {
    const group = PREVIEW_FORM_DEFINITION.sections.find((section) => section.id === field.sectionId)?.groupName;

    return [pathOf(field.name, group), FIELD_KIND_VALUE_TYPES[field.kind]];
  })
);

/**
 * The sample's rules whose fields are all on the form, each writing what it does in the sample. The rest are
 * left out, on the stage and in the export: a rule checks the value it was written for, and a number at the
 * phone's path would take a pattern it cannot pass and an export that does not compile.
 */
export function rulesOn(fields: ReadonlyMap<string, PortalValueType>): readonly PortalRule[] {
  return PREVIEW_RULES.filter((rule) => fieldsOf(rule).every((path) => fields.get(path) === SAMPLE_TYPES.get(path)));
}

/**
 * The rules as a Vest suite, which the schema runs through `validateStandardSchema`.
 *
 * A factory rather than a shared constant: a suite from `create` carries its own state, and the cost of a
 * run grows with every form that has ever used it — `runStatic` does not isolate that, and `reset()` does not
 * clear it. Each build of the form gets its own.
 */
export function createPreviewSuite(rules: readonly PortalRule[]) {
  return create((model: PreviewModel) => {
    mode(Modes.ALL);

    for (const { target, message, check } of rules) {
      const value = readPath(model, target);

      switch (check.kind) {
        case 'required':
          test(target, message, () => {
            enforce(value).isNotEmpty();
          });
          break;
        case 'pattern':
          omitWhen(!value, () => {
            test(target, message, () => {
              enforce(value as string).matches(check.pattern);
            });
          });
          break;
        case 'maxItems':
          test(target, message, () => {
            enforce(value as string[]).shorterThanOrEquals(check.max);
          });
          break;
        case 'cross':
          test(target, message, () => {
            enforce(check.test(model as unknown as SampleModel)).isTruthy();
          });
      }
    }
  });
}

/** A key's Zod type, from what its field writes. */
const ZOD_TYPES: Readonly<Record<PortalValueType, () => z.ZodType>> = {
  'string': () => z.string(),
  'string | null': () => z.string().nullable(),
  'string[]': () => z.array(z.string()),
  'Date | null': () => z.date().nullable(),
  'boolean': () => z.boolean(),
  'number': () => z.number()
};

/** One field check, chained onto its key's Zod schema. A format check leaves `''` to the required check. */
function zodCheck(type: PortalValueType, schema: z.ZodType, { message, check }: PortalRule): z.ZodType {
  switch (check.kind) {
    case 'required':
      return type === 'string' ? (schema as z.ZodString).min(1, message) : schema.refine((value) => !!value, message);
    case 'pattern':
      return schema.refine((value) => !value || check.pattern.test(value as string), message);
    case 'maxItems':
      return (schema as z.ZodArray<z.ZodString>).max(check.max, message);
    default:
      return schema;
  }
}

/**
 * The rules as a Zod schema, which the schema runs through `validateStandardSchema`. It holds no state, so
 * one per build is only for the rules the build has.
 *
 * Its keys are the fields the rules read, typed from what each writes in the sample — which `rulesOn` holds
 * them to — nested under a group as the model is. A check across fields is a refinement of the whole,
 * reporting on the path it names.
 */
export function previewZodSchema(rules: readonly PortalRule[]) {
  const keys = new Map<string, z.ZodType>();

  for (const path of new Set(rules.flatMap(fieldsOf))) {
    const type = SAMPLE_TYPES.get(path)!;
    const own = rules.filter((rule) => rule.target === path);

    keys.set(
      path,
      own.reduce((schema, rule) => zodCheck(type, schema, rule), ZOD_TYPES[type]())
    );
  }

  return rules.reduce<z.ZodType<PreviewModel>>(
    (schema, { target, message, check }) =>
      check.kind === 'cross'
        ? schema.refine((model) => check.test(model as unknown as SampleModel), {
            error: message,
            path: target ? target.split('.') : []
          })
        : schema,
    zodObject(keys)
  );
}

/** A `z.object` over dotted keys, a group's nested under its name. */
function zodObject(keys: ReadonlyMap<string, z.ZodType>): z.ZodType<PreviewModel> {
  const shape: Record<string, z.ZodType> = {};
  const groups = new Map<string, Map<string, z.ZodType>>();

  for (const [path, type] of keys) {
    const [head, ...rest] = path.split('.');

    if (!rest.length) shape[head!] = type;
    else groups.set(head!, (groups.get(head!) ?? new Map()).set(rest.join('.'), type));
  }

  for (const [name, members] of groups) shape[name] = zodObject(members);

  return z.object(shape) as unknown as z.ZodType<PreviewModel>;
}

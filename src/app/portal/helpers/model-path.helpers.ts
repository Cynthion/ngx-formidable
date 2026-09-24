/**
 * Reading and building the model by dotted path.
 *
 * A section carrying a `groupName` renders as an `ngModelGroup`, and Angular nests that group's controls
 * under its name — so `date` in the `when` group is `when.date` everywhere the portal names it: in the
 * model, in the shape, as a rule target and as the key its errors come back under.
 */

/** The model path for a control: `group.name` inside a group, `name` outside one. */
export function pathOf(name: string, groupName?: string): string {
  return groupName ? `${groupName}.${name}` : name;
}

/** The value at a dotted path, or `undefined` where any step of it is missing. */
export function readPath(model: Record<string, unknown>, path: string): unknown {
  let current: unknown = model;

  for (const step of path.split('.')) {
    if (typeof current !== 'object' || current === null) return undefined;

    current = (current as Record<string, unknown>)[step];
  }

  return current;
}

/** A nested object from dotted paths, which is the shape Angular's own form value comes back in. */
export function buildNested(entries: readonly (readonly [string, unknown])[]): Record<string, unknown> {
  const root: Record<string, unknown> = {};

  for (const [path, value] of entries) {
    const steps = path.split('.');
    const leaf = steps.pop()!;
    let target = root;

    for (const step of steps) {
      const next = target[step];

      if (typeof next !== 'object' || next === null) {
        target[step] = {};
      }

      target = target[step] as Record<string, unknown>;
    }

    target[leaf] = value;
  }

  return root;
}

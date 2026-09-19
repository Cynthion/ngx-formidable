/**
 * A heading, a section title or a variable name reduced to something usable as an id or a route parameter.
 *
 * One implementation, because three places need the same answer and an id that disagrees with the anchor
 * pointing at it is a dead link rather than a visible fault.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

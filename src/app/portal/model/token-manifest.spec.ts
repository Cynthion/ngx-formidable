import { LIBRARY_WRITTEN_TOKENS, THEME_TOKENS, THEME_TOKENS_BY_NAME } from './token-manifest';

/**
 * The drift gate. It walks the stylesheets the demo actually loads, collects the `--formidable-*` properties
 * the library declares in its `:root` block, and asserts that the manifest and the stylesheet agree in both
 * directions. A variable added to the library and not to the manifest is a control the portal never offers; a
 * manifest entry with nothing behind it is a control that does nothing.
 */
function declaredInRootBlock(): Set<string> {
  const declared = new Set<string>();

  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;

    try {
      rules = sheet.cssRules;
    } catch {
      // A cross-origin sheet cannot be read. The library's own is same-origin under the test builder.
      continue;
    }

    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSStyleRule) || rule.selectorText !== ':root') continue;

      for (const property of Array.from(rule.style)) {
        if (property.startsWith('--formidable-')) declared.add(property);
      }
    }
  }

  return declared;
}

describe('token manifest', () => {
  let declared: Set<string>;

  beforeAll(() => {
    declared = declaredInRootBlock();
  });

  it('finds the library stylesheet at all', () => {
    expect(declared.size).toBeGreaterThan(100);
  });

  it('exposes every variable the library declares', () => {
    const missing = [...declared].filter((name) => !THEME_TOKENS_BY_NAME.has(name));

    expect(missing).toEqual([]);
  });

  it('declares nothing the library does not', () => {
    const orphaned = THEME_TOKENS.filter((token) => token.class === 'declared' && !declared.has(token.name)).map(
      (token) => token.name
    );

    expect(orphaned).toEqual([]);
  });

  it('keeps the use-site variables out of the `:root` block, which is why they need curating', () => {
    const wrongClass = THEME_TOKENS.filter((token) => token.class === 'overridable' && declared.has(token.name)).map(
      (token) => token.name
    );

    expect(wrongClass).toEqual([]);
  });

  it('exposes nothing the library writes itself', () => {
    const exposed = LIBRARY_WRITTEN_TOKENS.filter((token) => THEME_TOKENS_BY_NAME.has(token.name)).map(
      (token) => token.name
    );

    expect(exposed).toEqual([]);
  });

  it('carries a description and a group for every entry', () => {
    const incomplete = THEME_TOKENS.filter((token) => !token.description || !token.group).map((token) => token.name);

    expect(incomplete).toEqual([]);
  });

  it('points every derived variable at a variable that exists', () => {
    const dangling = THEME_TOKENS.filter(
      (token) => token.derivedFrom && !THEME_TOKENS_BY_NAME.has(token.derivedFrom)
    ).map((token) => token.name);

    expect(dangling).toEqual([]);
  });

  it('names each variable once', () => {
    expect(THEME_TOKENS_BY_NAME.size).toBe(THEME_TOKENS.length);
  });
});

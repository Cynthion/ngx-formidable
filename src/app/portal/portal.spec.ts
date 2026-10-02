import { Locator, page, userEvent } from 'vitest/browser';
import { importTheme } from './export/theme-import';
import { FIELD_KIND_LABELS } from './model/field-capabilities';
import { PREVIEW_FIELDS } from './model/preview-form.definition';
import { THEME_PRESETS } from './model/presets';
import { THEME_TOKENS_BY_NAME } from './model/token-manifest';
import { editField, errors, model, openPanel, openSection, openStudio, tab } from './testing/studio';

/** **A Following Variable States Its Default** in `impl/backlog.md`. */
const FOLLOWER_STATES_DEFAULT = 'a following variable states the library default rather than the value in force';

/**
 * The Studio as a visitor uses it: every act goes through the page's own controls, and every claim is read
 * off what the page shows — the stage, the editor panel, the model drawer, the top bar's count.
 *
 * The insulation check is the one that cannot be read off the code: a custom property's `var()` is
 * substituted where the property is **declared**, so a theme scoped to a subtree half-applies. This asserts
 * that the chrome's re-emitted block really does recompute the derived values against its own bases.
 */
describe('portal', () => {
  const KINDS = Object.values(FIELD_KIND_LABELS);

  /** The run of chips under the fields, by the component each names. */
  function chipKinds(): string[] {
    return page
      .getByRole('button', { name: / — edit / })
      .elements()
      .map((chip) => chip.getAttribute('aria-label')!.split(' — edit ')[0]!);
  }

  function chip(field: string): Locator {
    return page.getByRole('button', { name: new RegExp(` — edit ${field}$`) });
  }

  /** Opens a panel field and picks one of its options, the way a user does: a click on each. */
  async function pick(field: string, option: string | RegExp): Promise<void> {
    // The display input takes no pointer events, so a user's click lands on the field around it.
    await userEvent.click(page.getByRole('combobox', { name: field }), { force: true });
    await userEvent.click(page.getByRole('option', { name: option }));
  }

  /** The number the top bar's copy button states, the variables the user has changed. */
  function changeCount(): number {
    return Number(
      page
        .getByRole('button', { name: /^Copy Theme \d+$/ })
        .element()
        .querySelector('.count')!.textContent
    );
  }

  async function applyPreset(key: string): Promise<void> {
    const preset = THEME_PRESETS.find((candidate) => candidate.key === key)!;

    await openPanel('Theme', 'Design');
    await openSection('Presets');
    await userEvent.click(page.getByRole('button').filter({ has: page.getByText(preset.label, { exact: true }) }));
  }

  /**
   * Sets one variable on its own control in `Variables`, found by its name in the filter. A length takes its
   * unit, then its amount; a colour goes into its well; anything else is typed and committed.
   */
  async function setVariable(name: string, value: string): Promise<void> {
    const token = THEME_TOKENS_BY_NAME.get(name)!;
    const label = new RegExp(`^${name.replace('--formidable-', '')}( reset)?$`);

    await openPanel('Theme', 'Variables');
    await userEvent.fill(page.getByRole('searchbox'), name);
    await openSection(token.group);

    if (token.control === 'color') {
      await userEvent.fill(page.getByLabelText(name, { exact: true }), value);
    } else if (token.control === 'length') {
      const [, amount, unit] = /^(-?[\d.]+)([a-z%]+)$/.exec(value)!;

      await userEvent.selectOptions(page.getByRole('combobox', { name: `${name} unit` }), unit!);
      await userEvent.fill(page.getByRole('spinbutton', { name: label }), amount!);
    } else {
      await userEvent.fill(page.getByRole('textbox', { name: label }), value);
      await userEvent.keyboard('{Enter}');
    }
  }

  /** The `:root` block `Export & Import` states for the theme on screen. */
  async function exportedTheme(): Promise<string> {
    await openPanel('Export & Import', 'Export', 'Theme');

    return document.querySelector('portal-export-panel pre')!.textContent!;
  }

  async function importBlock(block: string, ontoDefaults: boolean): Promise<void> {
    await openPanel('Export & Import', 'Import', 'Theme');
    await userEvent.fill(page.getByPlaceholder(':root { --formidable-field-height: 48px; }'), block);

    const onto = page.getByRole('checkbox', { name: 'Onto The Defaults' });
    if ((onto.element() as HTMLInputElement).checked !== ontoDefaults) await userEvent.click(onto);

    await userEvent.click(page.getByRole('button', { name: 'Apply', exact: true }));
  }

  // #region The stage

  it('renders the top bar, the stage and the editor panel', async () => {
    await openStudio();

    await expect.element(page.getByRole('navigation', { name: 'Portal' })).toBeVisible();
    await expect.element(page.getByRole('heading', { name: 'Order A Pizza', level: 1 })).toBeVisible();
    await expect.element(page.getByRole('tablist', { name: 'Editor panel' })).toBeVisible();
  });

  // Every field except the one its condition is currently holding back, which `hidden()` marks and `@if`
  // takes off the page. Each is named by its decorator's label, which is where its accessible name comes from.
  it('renders every unconditional field of the preview form, each named by its label', async () => {
    await openStudio();

    const shown = PREVIEW_FIELDS.filter((field) => field.id !== 'branch');

    expect(chipKinds().length).toBe(shown.length);

    for (const field of shown) {
      await expect.element(page.getByLabelText(field.label, { exact: true }).first()).toBeVisible();
    }

    expect(page.getByLabelText('Pick Up From').elements()).toEqual([]);
  });

  // The rule the layout cannot trade away: a component reachable only by flipping a switch is a component a
  // visitor never finds. It is what decides that the branch dropdown has a second, unconditional sibling.
  it('has every field kind on screen in the form’s default state', async () => {
    await openStudio();

    expect([...new Set(chipKinds())].sort()).toEqual([...KINDS].sort());
  });

  it('starts pre-filled, so the filled and floating-label states are on screen from the first frame', async () => {
    await openStudio();

    const [, filled, total] = /(\d+) of (\d+) filled/.exec(
      page.getByRole('button', { name: /^Model / }).element().textContent!
    )!;

    expect(Number(filled)).toBeGreaterThan(Number(total) / 2);
  });

  // #endregion

  // #region The model

  // The group is the one place the model is not flat, and the field tree follows it: a grouped field is bound
  // to the field under its group.
  it('nests a grouped section’s fields under its group name in the model', async () => {
    await openStudio();

    const values = await model();
    const when = values['when'] as Record<string, unknown>;

    expect(Date.parse(when['date'] as string)).not.toBeNaN();
    expect(Date.parse(when['time'] as string)).not.toBeNaN();
    expect(values['date']).toBeUndefined();
    expect(page.getByRole('combobox', { name: 'Date' }).element().getAttribute('name')).toMatch(/\.when\.date$/);
  });

  // The group rule reads both members and reports on neither, so its message has to land on the group.
  it('reports a group rule under the group rather than under either field', async () => {
    await openStudio();

    // 02:00 is outside the opening hours the group rule states; neither field is wrong on its own. Typed over
    // the time the way the field takes typing: a keyboard focus entry selects it.
    await userEvent.click(page.getByRole('textbox', { name: 'Time' }));
    await userEvent.tab({ shift: true });
    await userEvent.tab();
    await userEvent.keyboard('0200');
    await userEvent.keyboard('{Enter}');

    await expect.poll(async () => (await errors())['when']).toEqual(['We are open from 11:00 to 23:00.']);
    expect((await errors())['when.time']).toBeUndefined();
  });

  // One toggle, two fields, one each way. The hidden one keeps its key, and nothing validates it: the branch
  // is empty and required from the start, and reports only once it is on the form.
  it('swaps the two conditional fields when the toggle moves, and validates only the one showing', async () => {
    await openStudio();

    const address = page.getByRole('combobox', { name: 'Delivery Address' });

    expect((await errors())['branch']).toBeUndefined();

    // Typed away: the address is required, so it reports while it is on the form.
    await userEvent.fill(address, '');
    await expect.poll(async () => (await errors())['address']).toBeTruthy();
    expect((await model())['branch']).toBeNull();

    await userEvent.click(page.getByRole('switch', { name: 'How To Get It' }));

    await expect.element(page.getByRole('combobox', { name: 'Pick Up From' })).toBeVisible();
    await expect.element(address).not.toBeInTheDocument();
    expect(await model()).toHaveProperty('address', null);
    expect((await errors())['address']).toBeUndefined();
    expect((await errors())['branch']).toEqual(['Pick a branch to collect from.']);

    // The crust is the reason the swap is workable: the dropdown never leaves the form with the branch.
    await expect.element(page.getByRole('combobox', { name: 'Pizza' })).toBeVisible();
  });

  // The Studio filters the address options itself, so the field must render what that filter finds: a typo
  // fuse.js forgives, and a match on the subtitle, are both lost to a substring test of the label.
  it('renders what the fuzzy filter finds, beyond what a substring test of the label would', async () => {
    await openStudio();

    for (const typed of ['bahnhfo', '8001']) {
      await userEvent.fill(page.getByRole('combobox', { name: 'Delivery Address' }), typed);

      await expect.element(page.getByRole('option', { name: /^Bahnhofstrasse 12/ })).toBeVisible();
    }
  });

  // The template picker: choosing a pizza writes the two fields it stands for and leaves every other alone,
  // and a later edit to one of those fields is not undone — a pizza is a starting point, not a lock.
  it('applies a pizza’s preset when the user picks it, and does not re-apply it afterwards', async () => {
    await openStudio();

    expect(await model()).toMatchObject({ sauce: 'tomato', toppings: ['mozzarella', 'basil'] });

    await pick('Pizza', 'Diavola');

    // Untouched by the preset, which patches only the keys it names.
    await expect.poll(model).toMatchObject({
      pizza: 'diavola',
      sauce: 'arrabbiata',
      toppings: ['mozzarella', 'salami', 'chilli'],
      size: 'large'
    });

    await userEvent.click(page.getByRole('radio', { name: 'Pesto' }));

    await expect.poll(model).toMatchObject({ pizza: 'diavola', sauce: 'pesto' });
  });

  // `Custom` carries no preset, so picking it keeps what the user already chose rather than restoring a pizza.
  it('leaves the model alone for an option that carries no preset', async () => {
    await openStudio();

    await userEvent.click(page.getByRole('radio', { name: 'Pesto' }));
    await expect.poll(model).toMatchObject({ sauce: 'pesto' });

    await pick('Pizza', /^Custom/);

    await expect.poll(model).toMatchObject({ pizza: 'custom', sauce: 'pesto', toppings: ['mozzarella', 'basil'] });
  });

  // The second group, and a condition reading into it: `visibleWhen` names `method`, which the model holds
  // at `payment.method`.
  it('nests the payment group and resolves its conditional field through it', async () => {
    await openStudio();

    expect((await model())['payment']).toMatchObject({ method: 'card', cardNumber: '4242 4242 4242 4242' });
    await expect.element(page.getByRole('textbox', { name: 'Card Number' })).toBeVisible();

    await userEvent.click(page.getByRole('radio', { name: 'Twint' }));

    await expect.element(page.getByRole('textbox', { name: 'Card Number' })).not.toBeInTheDocument();
    expect((await model())['payment']).toMatchObject({ method: 'twint', cardNumber: '4242 4242 4242 4242' });
  });

  // #endregion

  // #region The theme

  it('renders a live miniature of a real field for every preset', async () => {
    await openStudio();

    const gallery = page.getByRole('region', { name: /^Presets/ });

    for (const preset of THEME_PRESETS) {
      await expect.element(gallery.getByText(preset.label, { exact: true })).toBeVisible();
    }

    const samples = Array.from(gallery.element().querySelectorAll('formidable-input-field input'), (input) => {
      return (input as HTMLInputElement).value;
    });

    expect(samples).toEqual(THEME_PRESETS.map(() => 'Sample'));
  });

  /**
   * The variables `USE_SITE_VARS` names are declared nowhere, so nothing masks them by inheritance and the
   * `:root` theme reaches straight into every thumbnail. Applying a preset that sets one used to repaint
   * the other eleven with it.
   */
  it('keeps every preset thumbnail on its own theme when another preset is applied', async () => {
    await openStudio();

    const radius = (key: string): string => {
      const index = THEME_PRESETS.findIndex((preset) => preset.key === key);
      const thumbnail = document.querySelectorAll('.portal-theme-scope')[index]!;

      return getComputedStyle(thumbnail.querySelector('formidable-input-field .field')!).borderStartStartRadius;
    };

    // `outlined`, which says nothing about its corners, next to `tab`, which rounds the top two to 18px.
    const outlined = THEME_PRESETS.find((preset) => preset.geometry === 'outlined')!.key;
    const tabbed = THEME_PRESETS.find((preset) => preset.geometry === 'tab')!.key;

    await applyPreset(THEME_PRESETS.find((preset) => preset.geometry === 'pill')!.key);
    const before = radius(outlined);

    await applyPreset(tabbed);

    await expect.poll(() => radius(tabbed)).toBe('18px');
    expect(radius(outlined)).toBe(before);
    expect(radius(outlined)).not.toBe('18px');
  });

  it('writes the theme to `:root`, where the derived variables are declared', async () => {
    await openStudio();

    await setVariable('--formidable-field-height', '80px');

    await expect.poll(() => document.documentElement.style.getPropertyValue('--formidable-field-height')).toBe('80px');
  });

  it('recomputes a derived variable from the theme on the page', async () => {
    await openStudio();

    await setVariable('--formidable-field-height', '80px');
    await setVariable('--formidable-field-border-thickness', '5px');

    // Declared once in `:root` as `height - 2 * border`, so it only follows if the theme is written there.
    const inner = () => getComputedStyle(document.documentElement).getPropertyValue('--formidable-field-inner-height');

    await expect.poll(inner).toContain('80px');
    expect(inner()).toContain('5px');
  });

  it('insulates the chrome from the theme, derived variables included', async () => {
    await openStudio();

    await setVariable('--formidable-field-height', '80px');
    await expect
      .poll(() => getComputedStyle(document.documentElement).getPropertyValue('--formidable-field-height'))
      .toBe('80px');

    const chrome = getComputedStyle(document.querySelector('.portal-chrome')!);

    expect(chrome.getPropertyValue('--formidable-field-height')).not.toContain('80px');
    expect(chrome.getPropertyValue('--formidable-field-inner-height')).not.toContain('80px');
  });

  it('removes a variable that leaves the theme instead of leaving it applied', async () => {
    await openStudio();

    const applied = () => document.documentElement.style.getPropertyValue('--formidable-field-padding-x');

    await setVariable('--formidable-field-padding-x', '40px');
    await expect.poll(applied).toBe('40px');

    await userEvent.click(page.getByRole('button', { name: 'reset' }));

    await expect.poll(applied).not.toBe('40px');
  });

  it('counts exactly the variables the export carries', async () => {
    await openStudio();

    await openPanel('Export & Import', 'Export', 'Theme');
    await userEvent.click(page.getByRole('checkbox', { name: 'Page Surface' }));
    await applyPreset(THEME_PRESETS[2]!.key);

    // The page surface counts as one, beside the variables.
    const exported = importTheme(await exportedTheme());
    const carried = Object.keys(exported.vars).length + (exported.page ? 1 : 0);

    expect(changeCount()).toBe(carried);
  });

  /**
   * What the stage paints: its own input field, and the page surface behind the form. Measured rather than
   * compared as declarations, because the export drops what only restates a default and the two can say the
   * same thing differently — `1px` against the shipped `0.0625rem`, a hex against an `rgb()`. Those are not a
   * difference in the view, and the view is the claim.
   */
  function painted(): Record<string, string> {
    const field = getComputedStyle(document.querySelector('portal-stage formidable-input-field .field')!);
    const surface = getComputedStyle(document.querySelector('portal-stage .page-surface')!);
    const properties = [
      'height',
      'backgroundColor',
      'color',
      'fontSize',
      'borderTopWidth',
      'borderTopColor',
      'borderStartStartRadius',
      'boxShadow',
      'paddingLeft'
    ] as const;

    // A family name matches regardless of case, so a stack that only changed case paints the same.
    return {
      ...Object.fromEntries(properties.map((property) => [property, field[property]])),
      fontFamily: field.fontFamily.toLowerCase(),
      surfaceBackground: surface.backgroundColor,
      surfaceText: surface.color
    };
  }

  it('reproduces the theme when the delta is read back onto the defaults', async () => {
    await openStudio();

    await openPanel('Export & Import', 'Export', 'Theme');
    await userEvent.click(page.getByRole('checkbox', { name: 'Page Surface' }));
    await applyPreset('consumer');

    const block = await exportedTheme();
    const before = painted();

    await applyPreset('brutalist');
    await expect.poll(painted).not.toEqual(before);

    // The bug this pins: the delta states only what differs from the library's defaults, so merged onto
    // another scheme every value that scheme sets and the delta does not restate survives into the result.
    await importBlock(block, false);
    await expect.element(page.getByText(/^Applied \d+ variables\.$/)).toBeVisible();
    expect(painted()).not.toEqual(before);

    await importBlock(block, true);

    await expect.poll(painted).toEqual(before);
  });

  // The other half of the pair: a block that states the defaults outright needs no help on the way in. Every
  // preset, because the hazard is per-variable — a scheme states a base and leaves what follows it unsaid,
  // and a default written over that base would contradict it.
  it('reproduces every preset when the block states the defaults and is merged in', async () => {
    await openStudio();

    await openPanel('Export & Import', 'Export', 'Theme');
    await userEvent.click(page.getByRole('checkbox', { name: 'Explicit Defaults' }));
    await userEvent.click(page.getByRole('checkbox', { name: 'Page Surface' }));

    for (const preset of THEME_PRESETS) {
      await applyPreset(preset.key);

      const block = await exportedTheme();
      const before = painted();

      await applyPreset(THEME_PRESETS.find((other) => other.key !== preset.key)!.key);
      await importBlock(block, false);

      await expect.poll(() => ({ preset: preset.key, ...painted() })).toEqual({ preset: preset.key, ...before });
    }
  });

  // The counter is the page's primary claim: eight to twelve variables are enough. It has to start at the
  // bottom, or it says the opposite the moment the page paints.
  it('counts nothing for a theme that only restates the library defaults', async () => {
    await openStudio();

    expect(changeCount()).toBeGreaterThan(0);

    await applyPreset('enterprise');

    await expect.poll(changeCount).toBe(0);
  });

  // The shipped height is `3.5rem` in the stylesheet and `56px` in the scheme: the same length, so the same
  // theme. The default is the stylesheet's, read at runtime, so an override does not become the new default.
  it('compares against the default through the browser, not as text', async () => {
    await openStudio();
    await applyPreset('enterprise');

    await setVariable('--formidable-field-height', '57px');
    await expect.poll(changeCount).toBe(1);

    await setVariable('--formidable-field-height', '56px');
    await expect.poll(changeCount).toBe(0);
  });

  // A variable the library declares nowhere has no default of its own; it has the one of the variable it
  // follows, so its control states a length rather than nothing.
  it('resolves the default of a variable that is declared nowhere through the one it follows', async () => {
    await openStudio();
    await applyPreset('enterprise');

    const amount = (name: string) => page.getByRole('spinbutton', { name: new RegExp(`^${name}$`) });

    await openPanel('Theme', 'Variables');
    await userEvent.fill(page.getByRole('searchbox'), 'radius');
    await openSection(THEME_TOKENS_BY_NAME.get('--formidable-field-border-start-start-radius')!.group);

    await expect.element(page.getByText(/Follows\s+field-border-radius/).first()).toBeVisible();
    expect((amount('field-border-start-start-radius').element() as HTMLInputElement).value).toBe(
      (amount('field-border-radius').element() as HTMLInputElement).value
    );
  });

  // The starting preset rounds the field through `border-radius`, which the field's own radius and its four
  // corners follow. Unpinned, each still has to state the value in force: what the field paints.
  it('states the value a following variable paints', async ({ skip }) => {
    skip(FOLLOWER_STATES_DEFAULT);

    await openStudio();

    const corner = '--formidable-field-border-start-start-radius';
    const painted = getComputedStyle(document.querySelector('portal-stage formidable-input-field .field')!);

    await openPanel('Theme', 'Variables');
    await userEvent.fill(page.getByRole('searchbox'), 'radius');
    await openSection(THEME_TOKENS_BY_NAME.get(corner)!.group);

    const amount = page.getByRole('spinbutton', { name: /^field-border-start-start-radius$/ }).element();
    const unit = page.getByRole('combobox', { name: `${corner} unit` }).element();

    expect(`${(amount as HTMLInputElement).value}${(unit as HTMLSelectElement).value}`).toBe(
      painted.borderStartStartRadius
    );
  });

  it('counts the page surface and the family alongside the variables', async () => {
    await openStudio();
    await applyPreset('enterprise');
    await expect.poll(changeCount).toBe(0);

    await openSection('The Page Behind The Form');
    await userEvent.fill(page.getByLabelText('background', { exact: true }), '#101010');

    await expect.poll(changeCount).toBe(1);

    await openSection('Fonts');
    await userEvent.click(page.getByRole('button', { name: /^Monospace/ }));

    await expect.poll(changeCount).toBe(2);
  });

  /** The badge of the field text against the field fill, on the Repaint step. */
  async function textBadge(fill: string, text: string): Promise<HTMLElement> {
    await openPanel('Theme', 'Design');
    await openSection('Repaint');
    await userEvent.fill(page.getByLabelText('--formidable-color-field-background', { exact: true }), fill);
    await userEvent.fill(page.getByLabelText('--formidable-color-field-text', { exact: true }), text);

    return page.getByRole('listitem').filter({ hasText: 'Field text' }).element() as HTMLElement;
  }

  it('measures contrast against what the page actually paints', async () => {
    await openStudio();

    const badge = await textBadge('#ffffff', '#000000');

    await expect.poll(() => Number(badge.querySelector('.ratio')!.textContent)).toBeGreaterThan(20);
    expect(badge.classList).not.toContain('fails');
  });

  it('fails the badge for a fill the text cannot be read on', async () => {
    await openStudio();

    const badge = await textBadge('#ffffff', '#f2f2f2');

    await expect.poll(() => badge.classList.contains('fails')).toBe(true);
  });

  // #endregion

  // #region Chips

  // A chip names one field, so it has to land on that field's own scope — the two wider ones would answer
  // a question the chip did not ask.
  it('opens the editor panel at the Settings tab, at the field’s own scope, when a chip is used', async () => {
    await openStudio();

    await openPanel('Form', 'Settings', 'The Form');
    await userEvent.click(tab('Theme'));
    await userEvent.click(chip('Crust'));

    await expect.element(tab('Form')).toHaveAttribute('aria-selected', 'true');
    await expect.element(tab('Settings', 'Form sections')).toHaveAttribute('aria-selected', 'true');
    await expect.element(page.getByRole('button', { name: /^This Field/ })).toHaveAttribute('aria-pressed', 'true');
    await expect.element(page.getByRole('combobox', { name: 'Field', exact: true })).toHaveDisplayValue(/^Crust — /);
  });

  // Tabbing through the sample form is the thing being tested; a chip between every two fields doubles the
  // presses it takes and puts portal chrome in the middle of the run.
  it('keeps the chips out of the tab order', async () => {
    await openStudio();

    await userEvent.click(page.getByRole('textbox', { name: 'Name On The Order' }));
    await userEvent.tab();
    await expect.element(page.getByRole('spinbutton', { name: 'How Many' })).toHaveFocus();

    await userEvent.tab();
    await expect.element(page.getByRole('textbox', { name: 'Phone Number' })).toHaveFocus();
  });

  // Moving to a tab behind a collapsed panel changes nothing the user can see, so the move has to open it.
  it('expands a collapsed editor panel rather than moving a tab behind it', async () => {
    await openStudio();

    await userEvent.click(page.getByRole('button', { name: 'Collapse the editor panel' }));
    await expect.element(page.getByRole('tablist', { name: 'Editor panel' })).not.toBeInTheDocument();

    await userEvent.click(chip('Crust'));

    await expect.element(tab('Settings', 'Form sections')).toHaveAttribute('aria-selected', 'true');
    await expect.element(page.getByRole('button', { name: 'Collapse the editor panel' })).toBeVisible();
    await expect.element(page.getByRole('combobox', { name: 'Field', exact: true })).toHaveDisplayValue(/^Crust — /);
  });

  // The chip names the component rather than describing the configuration, because a description written
  // once cannot survive the field being edited — and says nothing at all about a field added later.
  it('names the component under every field, including one added in the structure editor', async () => {
    await openStudio();

    expect(chipKinds().length).toBe(PREVIEW_FIELDS.length - 1);
    expect(chipKinds()).toContain('Date');
    expect(chipKinds().every((kind) => KINDS.includes(kind))).toBe(true);

    await openPanel('Form', 'Structure');
    await openSection('Add');
    await userEvent.selectOptions(page.getByRole('combobox', { name: 'Field Type To Add' }), 'radio-group');
    await userEvent.click(page.getByRole('button', { name: 'Add', exact: true }).first());

    await expect.poll(() => chipKinds().length).toBe(PREVIEW_FIELDS.length);
    expect(chipKinds().every((kind) => KINDS.includes(kind))).toBe(true);
  });

  // The defect this replaces: the chip held a string, so editing the field left it stating the old value.
  // The chip states it as its accessible description, exactly as the `title` it replaced did. No `title` on
  // the run of them: the browser holds one back about a second, which is what this is not.
  it('restates what a field is set to once the field has been edited', async () => {
    await openStudio();

    expect(
      page
        .getByRole('button', { name: / — edit / })
        .elements()
        .filter((el) => el.hasAttribute('title'))
    ).toEqual([]);
    // The sample's date states no panel position of its own, so it has none to state.
    await expect.element(chip('Date')).toHaveAccessibleDescription(/^Date — Date/);
    await expect.element(chip('Date')).not.toHaveAccessibleDescription(/panelPosition/);

    await openPanel('Form', 'Settings', 'This Field');
    await editField('Date');
    await userEvent.selectOptions(page.getByRole('combobox', { name: 'Panel Position' }), 'sheet');

    await expect.element(chip('Date')).toHaveAccessibleDescription(/panelPosition: sheet/);
  });

  it('hides the chips when the stage says so', async () => {
    await openStudio();

    const toggle = page.getByRole('button', { name: 'Field Types' });

    await expect.element(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(chipKinds().length).toBeGreaterThan(0);

    await userEvent.click(toggle);

    await expect.poll(() => chipKinds().length).toBe(0);
  });

  // #endregion

  // #region The editor panel

  // The tabs say what the panel is, so a title row over them would only add the word "Inspector" — which
  // names a panel that edits rather than inspects, and costs a row of the height the bottom sheet is short of.
  it('makes the tab strip the editor panel’s header', async () => {
    await openStudio();

    const head = page.getByRole('banner').filter({ has: page.getByRole('tablist', { name: 'Editor panel' }) });

    await expect.element(head.getByRole('button', { name: 'Collapse the editor panel' })).toBeVisible();
    expect(head.element().textContent).not.toContain('Inspector');
  });

  // Every area carries the same second level, so the strip is learned once rather than per tab. Each half
  // has to render something of its own — an empty tab is worse than no tab.
  it('gives every area two halves, each of which renders its own view', async () => {
    await openStudio();

    const tabs = (strip: string) =>
      page
        .getByRole('tablist', { name: strip })
        .getByRole('tab')
        .elements()
        .map((element) => element.textContent!.trim());

    expect(tabs('Editor panel')).toEqual(['Theme', 'Form', 'Export & Import']);

    const views: [area: 'Theme' | 'Form' | 'Export & Import', strip: string, halves: Record<string, () => Locator>][] =
      [
        [
          'Theme',
          'Theme sections',
          {
            Design: () => page.getByRole('button', { name: 'Randomize' }),
            Variables: () => page.getByRole('searchbox')
          }
        ],
        [
          'Form',
          'Form sections',
          {
            Structure: () => page.getByRole('heading', { name: /^1 Start/ }),
            Settings: () => page.getByRole('group', { name: 'Applies to' })
          }
        ],
        [
          'Export & Import',
          'Export and import sections',
          {
            Export: () => page.getByRole('button', { name: 'Copy Theme', exact: true }),
            Import: () => page.getByRole('button', { name: 'Apply', exact: true })
          }
        ]
      ];

    for (const [area, strip, halves] of views) {
      await userEvent.click(tab(area));
      expect(tabs(strip), area).toEqual(Object.keys(halves));

      for (const [half, view] of Object.entries(halves)) {
        await userEvent.click(tab(half, strip));
        await expect.element(view()).toBeVisible();
      }
    }
  });

  // Structure before Settings: which fields exist has to be settled before what one of them is is worth saying.
  it('opens the form area on Structure', async () => {
    await openStudio();

    await userEvent.click(tab('Form'));

    await expect.element(tab('Structure', 'Form sections')).toHaveAttribute('aria-selected', 'true');
  });

  /**
   * Scope is a control, not the wording of three headings. Each position has to render its own editor and
   * only its own — the defect the three sibling accordions had was the same Decoration group on screen
   * twice, under names that had to be read to be told apart. The field picker governs one scope, so it is
   * inside it: above the switch it was the first control on the page and reached nothing a visitor could see.
   */
  it('gives the Settings half one editor per scope, and only one', async () => {
    await openStudio();
    await openPanel('Form', 'Settings');

    const scopes = page.getByRole('group', { name: 'Applies to' }).getByRole('button');

    expect(scopes.elements().map((scope) => scope.querySelector('.scope-option-label')!.textContent!.trim())).toEqual([
      'App Defaults',
      'The Form',
      'This Field'
    ]);

    const editors = {
      'App Defaults': page.getByRole('heading', { name: 'Take It Away' }),
      'The Form': page.getByRole('combobox', { name: 'Validator' }),
      'This Field': page.getByRole('combobox', { name: 'Field', exact: true })
    };

    for (const scope of Object.keys(editors) as (keyof typeof editors)[]) {
      await userEvent.click(page.getByRole('button', { name: new RegExp(`^${scope}`) }));

      await expect
        .element(page.getByRole('button', { name: new RegExp(`^${scope}`) }))
        .toHaveAttribute('aria-pressed', 'true');
      for (const [other, editor] of Object.entries(editors)) {
        expect(editor.elements().length, `${scope} ▸ ${other}`).toBe(other === scope ? 1 : 0);
      }
    }
  });

  // The three steps are the answer to "how do I make my own form?", which the old one-accordion-per-section
  // list never asked, let alone answered.
  it('walks Structure from where a form starts to how it grows', async () => {
    await openStudio();
    await openPanel('Form', 'Structure');

    await expect.element(page.getByRole('heading', { name: /^1 Start/ })).toBeVisible();
    await expect.element(page.getByRole('heading', { name: /^2 Sections And Fields/ })).toBeVisible();
    await expect.element(page.getByRole('heading', { name: /^3 Add/ })).toBeVisible();
  });

  it('starts a blank form and lands on the step that can fill it', async () => {
    await openStudio();
    await openPanel('Form', 'Structure');

    expect(chipKinds().length).toBe(PREVIEW_FIELDS.length - 1);

    await openSection('Start');
    await userEvent.click(page.getByRole('button', { name: /^Blank Form/ }));

    await expect.poll(() => chipKinds().length).toBe(0);
    // Adding is the only thing left to do, so that is the step that is open. One section, not none: every add
    // needs somewhere to add into.
    await expect
      .element(page.getByRole('heading', { name: /^3 Add/ }).getByRole('button'))
      .toHaveAttribute('aria-expanded', 'true');

    // Twice: building a form is a run of adds, so the step has to survive the first one.
    const add = page.getByRole('button', { name: 'Add', exact: true }).first();

    await userEvent.click(add);
    await userEvent.click(add);

    await expect.poll(() => chipKinds().length).toBe(2);
    // The stage stops claiming to be the sample: heading, intro and submit label all come from the form.
    await expect.element(page.getByRole('heading', { level: 1 })).toHaveTextContent('Your Form');
    await expect.element(page.getByText(/^Start from a pizza/)).not.toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Submit', exact: true })).toBeVisible();
  });

  it('sends the third way to start to the box a form is pasted into', async () => {
    await openStudio();
    await openPanel('Form', 'Structure');

    await openSection('Start');
    await userEvent.click(page.getByRole('button', { name: /^Paste Template/ }));

    // Not merely the import: the box a template goes into, rather than the theme's.
    await expect.element(tab('Export & Import')).toHaveAttribute('aria-selected', 'true');
    await expect.element(tab('Import', 'Export and import sections')).toHaveAttribute('aria-selected', 'true');
    await expect.element(tab('Template', 'Files')).toHaveAttribute('aria-selected', 'true');
    await expect.element(page.getByPlaceholder('<form [formRoot]="form"> … </form>')).toBeVisible();
  });

  it('sends App Defaults to the app config it exports', async () => {
    await openStudio();
    await openPanel('Form', 'Settings', 'App Defaults');

    await userEvent.click(page.getByRole('button', { name: 'Export ↗' }));

    await expect.element(tab('Export', 'Export and import sections')).toHaveAttribute('aria-selected', 'true');
    await expect.element(tab('App Config', 'Files')).toHaveAttribute('aria-selected', 'true');
    expect(document.querySelector('portal-export-panel pre')!.textContent).toContain('provideNgxFormidable');
  });

  // Direction first, then the file: everything goes out, and only what the Studio can read comes back in.
  it('offers every file under Export and only the theme and the template under Import', async () => {
    await openStudio();

    const files = () =>
      page
        .getByRole('tablist', { name: 'Files' })
        .getByRole('tab')
        .elements()
        .map((file) => file.textContent!.trim());

    await openPanel('Export & Import', 'Export');
    expect(files()).toEqual(['Theme', 'Template', 'Component', 'Schema', 'App Config']);

    await openPanel('Export & Import', 'Import');
    expect(files()).toEqual(['Theme', 'Template']);
  });

  // The template binds names only the component and its schema define, and leaves out what the app config
  // supplies, so all of them sit beside it — as tabs, one file on screen at a time.
  it('exports each file as a tab of its own, one at a time', async () => {
    await openStudio();
    await openPanel('Export & Import', 'Export');

    const files = page.getByRole('tablist', { name: 'Files' }).getByRole('tab');
    const shown = () => document.querySelector('portal-export-panel pre')!.textContent!;

    const expected: [file: string, name: string, text: string][] = [
      ['Theme', 'styles.css', ':root'],
      ['Template', 'my-form.html', '<form [formRoot]="form">'],
      ['Component', 'my-form.ts', 'export class MyForm {'],
      ['Schema', 'my-form.form.ts', 'export const myFormSchema = schema<MyFormModel>'],
      ['App Config', 'app.config.ts', 'provideNgxFormidable']
    ];

    for (const [file, name, text] of expected) {
      await userEvent.click(files.filter({ hasText: file }));

      await expect.element(files.filter({ hasText: file })).toHaveAttribute('aria-selected', 'true');
      expect(document.querySelectorAll('portal-export-panel pre').length, file).toBe(1);
      expect(shown(), file).toContain(text);
      expect(document.querySelector('portal-export-panel pre [class^="hljs-"]'), file).not.toBeNull();
      expect(document.querySelector('portal-export-panel .doc-code-bar')!.textContent!.trim(), file).toBe(name);
      await expect.element(page.getByRole('button', { name: `Copy ${file}`, exact: true })).toBeVisible();
      // The theme's options are the theme's alone.
      expect(page.getByRole('radio', { name: 'CSS' }).elements().length, file).toBe(file === 'Theme' ? 1 : 0);
    }
  });

  // A reset beside the copy is one misclick from wiping the work being exported, and each already lives where
  // its file is built: the preset gallery, and Structure's first step.
  it('keeps resets out of Export & Import', async () => {
    await openStudio();

    for (const [direction, files] of [
      ['Export', ['Theme', 'Template', 'Component', 'Schema', 'App Config']],
      ['Import', ['Theme', 'Template']]
    ] as const) {
      for (const file of files) {
        await openPanel('Export & Import', direction, file);

        expect(page.getByRole('button', { name: /reset/i }).elements(), `${direction} ▸ ${file}`).toEqual([]);
      }
    }
  });

  it('opens one accordion section at a time', async () => {
    await openStudio();

    const open = () =>
      page.getByRole('heading', { level: 3 }).getByRole('button', { expanded: true }).elements().length;

    expect(open()).toBe(1);

    await openSection('Reshape');

    expect(open()).toBe(1);
  });

  // #endregion

  // #region Layout

  // The two column headers sit side by side, so a difference between them reads as a step in the rule under
  // them.
  it('gives the two column headers one height', async () => {
    await openStudio();

    const stage = document.querySelector('portal-stage .stage-bar')!.getBoundingClientRect();
    const panel = document.querySelector('portal-inspector .head')!.getBoundingClientRect();

    expect(panel.left).toBeGreaterThan(stage.right - 1);
    expect(stage.top).toBeCloseTo(panel.top, 0);
    expect(stage.height).toBeCloseTo(panel.height, 0);
  });

  // Two fields sharing a grid row are rarely the same height — one carries a hint or an error and the other
  // does not — and the annotations under them are what a reader compares across the row. They line up
  // because each field lays its three rows out as a subgrid of the field grid, not because anything pushes
  // them to the bottom of the row, which staggers them again as soon as one readout is taller.
  it('starts the chip and the accessibility readout of a pair on the same line', async () => {
    await openStudio();

    await userEvent.click(page.getByRole('button', { name: 'Accessibility' }));
    await expect.poll(() => document.querySelectorAll('portal-accessibility-readout').length).toBeGreaterThan(0);

    const top = (element: Element) => element.getBoundingClientRect().top;
    const hasHint = (host: Element) => !host.querySelector('.hint-wrapper')?.classList.contains('hidden');
    const hosts = Array.from(document.querySelectorAll('portal-preview-field'));

    // The pair has to be uneven, or they would line up by accident and prove nothing. Their rendered
    // heights cannot say so — the bands equalize them, which is the thing under test — so the hint one of
    // them carries is what states it.
    const pair = hosts.slice(1).find((host, index) => {
      const previous = hosts[index]!;

      return top(host) === top(previous) && hasHint(host) !== hasHint(previous);
    });

    expect(pair, 'a row holding two fields of unequal height').toBeTruthy();

    const first = hosts[hosts.indexOf(pair!) - 1]!;

    expect(top(pair!.querySelector('.chip-row')!)).toBeCloseTo(top(first.querySelector('.chip-row')!), 0);
    expect(top(pair!.querySelector('portal-accessibility-readout')!)).toBeCloseTo(
      top(first.querySelector('portal-accessibility-readout')!),
      0
    );
  });

  // The stage is a fixed three-row grid, so an optional child of it shifts every row below — which once
  // pushed the drawer off the bottom of the viewport. Whatever the switches add has to stay inside the head.
  it('keeps the model drawer at the foot of the stage whatever the stage is showing', async () => {
    await openStudio();

    const fieldTypes = page.getByRole('button', { name: 'Field Types' });
    const accessibility = page.getByRole('button', { name: 'Accessibility' });
    const drawer = page.getByRole('button', { name: /^Model / });

    for (const [switched, context] of [
      [fieldTypes, 'chips off'],
      [accessibility, 'chips off, accessibility on'],
      [fieldTypes, 'chips on, accessibility on'],
      [accessibility, 'chips on']
    ] as const) {
      await userEvent.click(switched);

      const stage = document.querySelector('portal-stage')!.getBoundingClientRect();
      const bar = drawer.element().getBoundingClientRect();

      expect(bar.bottom, context).toBeCloseTo(stage.bottom, 0);
      expect(stage.bottom, context).toBeLessThanOrEqual(window.innerHeight);
    }
  });

  it('states each annotation on its own line, and only while it is on', async () => {
    await openStudio();

    const lines = () =>
      ['Click one to edit that field.', 'Verify with a real screen reader.'].map(
        (line) => page.getByText(line, { exact: false }).elements().length
      );

    expect(lines()).toEqual([1, 0]);

    await userEvent.click(page.getByRole('button', { name: 'Accessibility' }));
    await expect.poll(lines).toEqual([1, 1]);

    await userEvent.click(page.getByRole('button', { name: 'Field Types' }));
    await expect.poll(lines).toEqual([0, 1]);
  });

  // The divider takes the keyboard as well as the pointer: an arrow moves it one step, wider to the left.
  it('resizes the editor panel from its divider', async () => {
    await openStudio();

    const width = () => document.querySelector('portal-inspector')!.getBoundingClientRect().width;
    const before = width();

    // A pointer on the divider drags rather than focuses it, so the keyboard reaches it the way it reaches
    // anything: it comes just before the panel's tabs.
    await userEvent.click(tab('Theme'));
    await userEvent.tab({ shift: true });
    await expect.element(page.getByRole('separator', { name: 'Resize the inspector' })).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');

    await expect.poll(width).toBeGreaterThan(before);
  });

  // A `sheet` panel is `position: fixed`, and the page it belongs to ends at the preview's edges. Without a
  // containing block on the preview viewport it spans the browser window instead, which puts it off-centre
  // and half under the editor panel.
  it('pins a sheet panel to the stage rather than to the window', async () => {
    await openStudio();

    await openPanel('Form', 'Settings', 'This Field');
    await editField('Date');
    await userEvent.selectOptions(page.getByRole('combobox', { name: 'Panel Position' }), 'sheet');
    await userEvent.click(page.getByRole('combobox', { name: 'Date' }));
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');

    const date = page.getByRole('combobox', { name: 'Date' }).element();
    await expect.poll(() => date.getAttribute('aria-expanded')).toBe('true');

    const panel = document.getElementById(date.getAttribute('aria-controls')!)!.closest('.panel')!;
    const stage = document.querySelector('.stage-viewport')!.getBoundingClientRect();
    // Rounded to the pixel, and polled: the sheet slides in from below.
    const offsets = () => {
      const sheet = panel.getBoundingClientRect();

      return [sheet.left - stage.left, sheet.right - stage.right, sheet.bottom - stage.bottom].map(Math.round);
    };

    // Guards the assertions below against passing on a preview that happens to fill the window.
    expect(stage.right).toBeLessThan(window.innerWidth - 100);

    await expect.poll(offsets).toEqual([0, 0, 0]);
  });

  it('keeps the editor panel above the library’s own sheet z-index', async () => {
    await openStudio();

    const sheet = Number(getComputedStyle(document.documentElement).getPropertyValue('--formidable-sheet-z-index'));

    expect(Number(getComputedStyle(document.querySelector('portal-inspector')!).zIndex)).toBeGreaterThan(sheet);
  });

  // #endregion

  it('applies the mask the settings give a textarea', async () => {
    await openStudio();

    const notes = page.getByRole('textbox', { name: 'Notes For The Kitchen' });

    await userEvent.clear(notes);
    await openPanel('Form', 'Settings', 'This Field');
    await editField('Notes For The Kitchen');
    await userEvent.fill(page.getByRole('textbox', { name: 'Mask' }), '000-000');
    await userEvent.keyboard('{Enter}');

    await userEvent.click(notes);
    await userEvent.keyboard('123456');

    await expect.element(notes).toHaveValue('123-456');
  });
});

import { ChangeDetectionStrategy, Component, DOCUMENT, effect, inject, input, signal } from '@angular/core';

interface AccessibilityFact {
  readonly label: string;
  readonly value: string;
}

const FOCUSABLE =
  'input, select, textarea, button, [tabindex]:not([tabindex="-1"]), [role="switch"], [role="radiogroup"], [role="group"]';

/**
 * States the accessibility data the library actually produced for one field.
 *
 * It reads the rendered DOM rather than simulating a screen reader: a simulation cannot reproduce a real one,
 * so it would misstate the library's behaviour instead of demonstrating it. Verify with a real screen reader.
 */
@Component({
  selector: 'portal-accessibility-readout',
  templateUrl: './accessibility-readout.component.html',
  styleUrl: './accessibility-readout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccessibilityReadoutComponent {
  private readonly doc = inject(DOCUMENT);

  /** The subtree to read. The preview field hands over its own host element. */
  public readonly root = input.required<HTMLElement>();
  /** Bumped by the caller whenever the field may have repainted, so the readout re-reads. */
  public readonly revision = input(0);

  protected readonly facts = signal<readonly AccessibilityFact[]>([]);

  constructor() {
    effect(() => {
      const root = this.root();
      this.revision();

      // The attributes only exist once the field has rendered, which is after this effect's own pass.
      queueMicrotask(() => this.facts.set(this.read(root)));
    });
  }

  private read(root: HTMLElement): AccessibilityFact[] {
    const control = this.controlOf(root);

    if (!control) return [{ label: 'Control', value: 'not found' }];

    const facts: AccessibilityFact[] = [
      { label: 'Element', value: control.tagName.toLowerCase() },
      { label: 'Role', value: control.getAttribute('role') ?? this.implicitRole(control) }
    ];

    const name = this.accessibleName(control);
    facts.push({ label: 'Name', value: name || '— unnamed' });

    const described = (control.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => {
        const target = this.doc.getElementById(id);
        const text = (target?.textContent ?? '').trim();

        return text ? `${id}: “${text}”` : `${id}: empty`;
      });
    facts.push({ label: 'Described by', value: described.length ? described.join(' · ') : 'none' });

    for (const attribute of [
      'aria-invalid',
      'aria-required',
      'aria-readonly',
      'aria-disabled',
      'aria-expanded',
      'aria-activedescendant',
      'aria-checked',
      'aria-haspopup',
      'aria-autocomplete',
      'aria-valuetext'
    ]) {
      const value = control.getAttribute(attribute);
      if (value !== null) facts.push({ label: attribute, value });
    }

    const focusable = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (element) => element.offsetParent !== null || element === control
    );
    facts.push({
      label: 'Focus order',
      value: focusable.map((element) => element.tagName.toLowerCase()).join(' → ') || 'none'
    });

    return facts;
  }

  /** The element that actually takes focus, which is not always the field's own host. */
  private controlOf(root: HTMLElement): HTMLElement | null {
    return (
      root.querySelector<HTMLElement>('[role="combobox"], [role="switch"], [role="radiogroup"], [role="group"]') ??
      root.querySelector<HTMLElement>('input:not([type="hidden"]), select, textarea')
    );
  }

  private implicitRole(control: HTMLElement): string {
    const tag = control.tagName.toLowerCase();
    const type = control.getAttribute('type');

    if (tag === 'select') return 'combobox (native)';
    if (tag === 'textarea') return 'textbox';
    if (tag === 'input' && type === 'range') return 'slider';
    if (tag === 'input') return 'textbox';

    return 'none';
  }

  private accessibleName(control: HTMLElement): string {
    const labelledBy = control.getAttribute('aria-labelledby');

    if (labelledBy) {
      return labelledBy
        .split(/\s+/)
        .map((id) => (this.doc.getElementById(id)?.textContent ?? '').trim())
        .filter(Boolean)
        .join(' ');
    }

    const label = control.getAttribute('aria-label');
    if (label) return label;

    const id = control.getAttribute('id');
    if (id) {
      const native = this.doc.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (native) return (native.textContent ?? '').trim();
    }

    return '';
  }
}

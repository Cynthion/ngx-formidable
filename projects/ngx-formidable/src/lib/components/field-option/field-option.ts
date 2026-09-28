import { NgTemplateOutlet } from '@angular/common';
import {
  AfterContentInit,
  Component,
  computed,
  ElementRef,
  forwardRef,
  inject,
  input,
  OnInit,
  signal,
  TemplateRef,
  viewChild
} from '@angular/core';
import {
  FieldOptionLayout,
  FieldOptionRole,
  FORMIDABLE_OPTION,
  FORMIDABLE_OPTION_FIELD,
  FormidableOption,
  FormidableOptionField,
  FormidableOptionSource
} from '../../models/formidable.model';

/**
 * One option of a select, dropdown, autocomplete, radio group or checkbox group, projected into the field
 * that owns it. Its content is optional: with none it renders its `label`, with some it renders that instead
 * and takes the text as the label.
 *
 * Must sit inside one of those fields. The alternative is the field's `options` input, which takes the same
 * options as plain data; a field accepts both at once and merges them.
 */
@Component({
  selector: 'formidable-field-option',
  templateUrl: './field-option.html',
  styleUrls: ['./field-option.scss'],
  imports: [NgTemplateOutlet],
  host: {
    '[attr.role]': 'role',
    '[attr.aria-selected]': 'ariaSelected',
    '[attr.aria-checked]': 'ariaChecked',
    '[attr.aria-disabled]': 'ariaDisabled'
  },
  providers: [
    {
      // required to provide this component as FormidableOptionSource
      provide: FORMIDABLE_OPTION,
      useExisting: forwardRef(() => FieldOption)
    }
  ]
})
export class FieldOption implements FormidableOptionSource, OnInit, AfterContentInit {
  private parent = inject<FormidableOptionField>(FORMIDABLE_OPTION_FIELD, { optional: true })!;
  readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly contentTemplate = viewChild.required<TemplateRef<unknown>>('contentTemplate');

  /** What reaches the model when this option is picked. */
  readonly value = input.required<string>();

  /** Display text. Taken from the projected content when that is given instead. */
  readonly label = input<string | undefined>(undefined);

  /** Cannot be picked, and is skipped by the keyboard, but reads as available. */
  readonly readonly = input(false);

  /** Cannot be picked, and is skipped by the keyboard. */
  readonly disabled = input(false);

  /** Whether this option is the current selection. Driven by the field — do not bind it yourself. */
  readonly selected = input(false);

  /** Whether the keyboard cursor is on this option. Driven by the field — do not bind it yourself. */
  readonly highlighted = input(false);

  /**
   * What renders in place of the label: the content projected into the option this one renders. Driven by
   * the field — do not bind it yourself.
   */
  readonly content = input<TemplateRef<unknown> | undefined>(undefined);

  /** Whether an autocomplete's filter text matches. The default is a case-insensitive substring test. */
  readonly match = input<((filterValue: string) => boolean) | undefined>(undefined);

  /** How the option paints itself. Independent of its ARIA role, which the owning field decides. */
  readonly layout = input<FieldOptionLayout>('inline');

  // A signal, because the `option` computed reads it: a computed that read a plain field would cache
  // whatever it held before `ngAfterContentInit` and never see it flip.
  protected readonly hasContent = signal(false);

  // The label taken off the projected content, kept apart from the input so nothing writes to an input.
  private readonly projectedLabel = signal<string | undefined>(undefined);

  get template(): TemplateRef<unknown> | undefined {
    return this.hasContent() ? this.contentTemplate() : undefined;
  }

  readonly option = computed<FormidableOption>(() => ({
    value: this.value(),
    label: this.label() || this.projectedLabel(),
    template: this.template,
    readonly: this.readonly(),
    disabled: this.disabled(),
    match: this.match() ?? this.matchSelf
  }));

  private readonly matchSelf: (filterValue: string) => boolean = (filterValue) =>
    this.option().label?.toLowerCase().includes(filterValue.toLowerCase()) ?? false;

  // #region ARIA

  // Everything here sits on the host, not on the inner div: the host is the direct child of the
  // `listbox` / `radiogroup` / `group` that owns the option, and an element with no role in between
  // would break that ownership. The id is bound by the parent, which is what knows the index.

  // The container decides, not the option's `layout` — that is a look a consumer may set freely.
  get role(): FieldOptionRole {
    return this.parent?.optionRole ?? 'option';
  }

  // Bound raw rather than `|| null`: an unselected option has to report `false`, not stay silent.
  get ariaSelected(): boolean | null {
    return this.role === 'option' ? this.selected() : null;
  }

  get ariaChecked(): boolean | null {
    return this.role === 'option' ? null : this.selected();
  }

  // ARIA has no `aria-readonly` for these roles, and both flags mean the same thing here: unselectable.
  get ariaDisabled(): true | null {
    return this.disabled() || this.readonly() || null;
  }

  // #endregion

  ngOnInit() {
    if (!this.parent) {
      throw new Error(
        '[ngx-formidable] formidable-field-option must be used inside a component that provides FORMIDABLE_OPTION_FIELD (i.e. implements FormidableOptionField).'
      );
    }
  }

  ngAfterContentInit(): void {
    // Angular has no API to check whether <ng-content> received content; instantiating the template
    // temporarily is the standard workaround. The view is thrown away at once, so the content still renders
    // in one place only: where the field renders the option.
    const view = this.contentTemplate().createEmbeddedView({});
    const hasContent = view.rootNodes.some((n: Node) => n.nodeType !== Node.TEXT_NODE || !!n.textContent?.trim());

    this.hasContent.set(hasContent);

    if (hasContent) {
      this.projectedLabel.set(
        view.rootNodes
          .map((n: Node) => n.textContent ?? '')
          .join('')
          .trim()
      );
    }

    view.destroy();
  }

  protected onClick(): void {
    if (this.readonly() || this.disabled()) return;

    this.parent.selectOption(this.option());
  }
}

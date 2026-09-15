import { CommonModule } from '@angular/common';
import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  forwardRef,
  HostBinding,
  inject,
  input,
  OnInit,
  signal,
  TemplateRef,
  ViewChild
} from '@angular/core';
import {
  FieldOptionLayout,
  FieldOptionRole,
  FORMIDABLE_OPTION,
  FORMIDABLE_OPTION_FIELD,
  IFormidableOption,
  IFormidableOptionField,
  IFormidableOptionSource
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
  templateUrl: './field-option.component.html',
  styleUrls: ['./field-option.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  providers: [
    {
      // required to provide this component as IFormidableOptionSource
      provide: FORMIDABLE_OPTION,
      useExisting: forwardRef(() => FieldOptionComponent)
    }
  ]
})
export class FieldOptionComponent implements IFormidableOptionSource, OnInit, AfterContentInit {
  private parent = inject<IFormidableOptionField>(FORMIDABLE_OPTION_FIELD, { optional: true })!;
  readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  @ViewChild('contentTemplate', { static: true }) private contentTemplate!: TemplateRef<unknown>;

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

  /** Replaces the field's own selection handling, for an option that does something else instead. */
  readonly select = input<(() => void) | undefined>(undefined);

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
    return this.hasContent() ? this.contentTemplate : undefined;
  }

  readonly option = computed<IFormidableOption>(() => ({
    value: this.value(),
    label: this.label() || this.projectedLabel(),
    template: this.template,
    readonly: this.readonly(),
    disabled: this.disabled(),
    select: this.select() ?? this.selectSelf,
    match: this.match() ?? this.matchSelf
  }));

  private readonly selectSelf: () => void = () => this.parent.selectOption(this.option());
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

  @HostBinding('attr.role')
  get roleAttribute(): FieldOptionRole {
    return this.role;
  }

  // Bound raw rather than `|| null`: an unselected option has to report `false`, not stay silent.
  @HostBinding('attr.aria-selected')
  get ariaSelected(): boolean | null {
    return this.role === 'option' ? this.selected() : null;
  }

  @HostBinding('attr.aria-checked')
  get ariaChecked(): boolean | null {
    return this.role === 'option' ? null : this.selected();
  }

  // ARIA has no `aria-readonly` for these roles, and both flags mean the same thing here: unselectable.
  @HostBinding('attr.aria-disabled')
  get ariaDisabled(): true | null {
    return this.disabled() || this.readonly() || null;
  }

  // #endregion

  ngOnInit() {
    if (!this.parent) {
      throw new Error(
        '[ngx-formidable] formidable-field-option must be used inside a component that provides FORMIDABLE_OPTION_FIELD (i.e. implements IFormidableOptionField).'
      );
    }
  }

  ngAfterContentInit(): void {
    // Angular has no API to check whether <ng-content> received content;
    // instantiating the template temporarily is the standard workaround.
    const view = this.contentTemplate.createEmbeddedView({});
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

    this.option().select?.();
  }
}

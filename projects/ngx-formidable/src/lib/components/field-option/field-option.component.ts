import { CommonModule } from '@angular/common';
import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  forwardRef,
  HostBinding,
  inject,
  Input,
  OnInit,
  TemplateRef,
  ViewChild
} from '@angular/core';
import {
  FieldOptionLayout,
  FieldOptionRole,
  FORMIDABLE_OPTION,
  FORMIDABLE_OPTION_FIELD,
  IFormidableOption,
  IFormidableOptionField
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
      // required to provide this component as IFormidableOption
      provide: FORMIDABLE_OPTION,
      useExisting: forwardRef(() => FieldOptionComponent)
    }
  ]
})
export class FieldOptionComponent implements IFormidableOption, OnInit, AfterContentInit {
  private parent = inject<IFormidableOptionField>(FORMIDABLE_OPTION_FIELD, { optional: true })!;
  readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  @ViewChild('contentTemplate', { static: true }) private contentTemplate!: TemplateRef<unknown>;

  /** What reaches the model when this option is picked. */
  @Input({ required: true }) value!: string;

  /** Display text. Taken from the projected content when that is given instead. */
  @Input() label?: string;

  /** Cannot be picked, and is skipped by the keyboard, but reads as available. */
  @Input()
  readonly = false;

  /** Cannot be picked, and is skipped by the keyboard. */
  @Input()
  disabled = false;

  /** Whether this option is the current selection. Driven by the field — do not bind it yourself. */
  @Input()
  selected = false;

  /** Whether the keyboard cursor is on this option. Driven by the field — do not bind it yourself. */
  @Input()
  highlighted = false;

  /** Replaces the field's own selection handling, for an option that does something else instead. */
  @Input() select?: () => void = () => {
    // default select
    this.parent.selectOption(this);
  };

  /** Whether an autocomplete's filter text matches. The default is a case-insensitive substring test. */
  @Input() match?: (filterValue: string) => boolean = (filterValue: string) => {
    // default match
    return this.label?.toLowerCase().includes(filterValue.toLowerCase()) ?? false;
  };

  /** How the option paints itself. Independent of its ARIA role, which the owning field decides. */
  @Input() layout: FieldOptionLayout = 'inline';

  hasContent = false;

  private readonly cdRef = inject(ChangeDetectorRef);

  get template(): TemplateRef<unknown> | undefined {
    return this.hasContent ? this.contentTemplate : undefined;
  }

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
    return this.role === 'option' ? this.selected : null;
  }

  @HostBinding('attr.aria-checked')
  get ariaChecked(): boolean | null {
    return this.role === 'option' ? null : this.selected;
  }

  // ARIA has no `aria-readonly` for these roles, and both flags mean the same thing here: unselectable.
  @HostBinding('attr.aria-disabled')
  get ariaDisabled(): true | null {
    return this.disabled || this.readonly || null;
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
    this.hasContent = view.rootNodes.some((n: Node) => n.nodeType !== Node.TEXT_NODE || !!n.textContent?.trim());

    if (this.hasContent && !this.label) {
      this.label = view.rootNodes
        .map((n: Node) => n.textContent ?? '')
        .join('')
        .trim();
    }

    view.destroy();

    if (this.hasContent) {
      this.cdRef.markForCheck();
    }
  }

  protected onClick(): void {
    if (this.readonly || this.disabled || !this.select) return;

    this.select();
  }
}

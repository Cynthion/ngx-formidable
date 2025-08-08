import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  forwardRef,
  HostBinding,
  Inject,
  Input,
  Optional,
  TemplateRef,
  ViewChild
} from '@angular/core';
import {
  FieldOptionLayout,
  FORMIDABLE_FIELD_OPTION,
  FORMIDABLE_OPTION_FIELD,
  IFormidableFieldOption,
  IFormidableOptionField
} from '../../models/formidable.model';

/**
 * Represents a single option in select, dropdown, autocomplete, radio or checkbox group.
 * Provides template outlet for custom content, and handles:
 * - `value: string`         (required)
 * - `label?: string`        (display text fallback)
 * - `disabled`, `readonly`, `selected`, `highlighted`
 * - `match?(filter: string)` custom filter predicate
 * - `select?()` custom select callback
 *
 * @example
 * ```html
 * <formidable-select-field name="gender">
 *   <formidable-field-option [value]="'other'" [label]="'Other'"></formidable-field-option>
 * </formidable-select-field>
 * ```
 */
@Component({
  selector: 'formidable-field-option',
  templateUrl: './field-option.component.html',
  styleUrls: ['./field-option.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      // required to provide this component as IFormidableFieldOption
      provide: FORMIDABLE_FIELD_OPTION,
      useExisting: forwardRef(() => FieldOptionComponent)
    }
  ]
})
export class FieldOptionComponent implements IFormidableFieldOption {
  @ViewChild('contentTemplate', { static: true }) private contentTemplate!: TemplateRef<unknown>;

  @Input({ required: true }) value!: string;
  @Input() label?: string;

  @HostBinding('class.readonly')
  @Input()
  readonly = false;

  @HostBinding('class.disabled')
  @Input()
  disabled = false;

  @HostBinding('class.selected')
  @Input()
  selected = false;

  @HostBinding('class.highlighted')
  @Input()
  highlighted = false;

  @Input() select?: () => void = () => {
    // default select
    this.parent.selectOption(this);
  };

  @Input() match?: (filterValue: string) => boolean = (filterValue: string) => {
    // default match
    return this.label?.toLowerCase().includes(filterValue.toLowerCase()) ?? false;
  };

  @Input() layout: FieldOptionLayout = 'inline';

  get template(): TemplateRef<unknown> {
    return this.contentTemplate;
  }

  protected hasProjectedContent = true;

  constructor(
    @Optional() @Inject(FORMIDABLE_OPTION_FIELD) private parent: IFormidableOptionField,
    public readonly elementRef: ElementRef<HTMLElement>
  ) {
    if (!this.parent) {
      throw new Error(
        '[ngx-formidable] formidable-field-option must be used inside a component that provides FORMIDABLE_OPTION_FIELD (i.e. implements IFormidableOptionField).'
      );
    }
  }

  protected onClick(): void {
    if (this.readonly || this.disabled || !this.select) return;

    this.select();
  }
}

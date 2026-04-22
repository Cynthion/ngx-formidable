import { CommonModule } from '@angular/common';
import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  forwardRef,
  inject,
  Inject,
  Input,
  OnInit,
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
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      // required to provide this component as IFormidableFieldOption
      provide: FORMIDABLE_FIELD_OPTION,
      useExisting: forwardRef(() => FieldOptionComponent)
    }
  ]
})
export class FieldOptionComponent implements IFormidableFieldOption, OnInit, AfterContentInit {
  @ViewChild('contentTemplate', { static: true }) private contentTemplate!: TemplateRef<unknown>;

  @Input({ required: true }) value!: string;
  @Input() label?: string;

  @Input()
  readonly = false;

  @Input()
  disabled = false;

  @Input()
  selected = false;

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

  hasContent = false;

  private readonly cdRef = inject(ChangeDetectorRef);

  get template(): TemplateRef<unknown> | undefined {
    return this.hasContent ? this.contentTemplate : undefined;
  }

  constructor(
    @Optional() @Inject(FORMIDABLE_OPTION_FIELD) private parent: IFormidableOptionField,
    public readonly elementRef: ElementRef<HTMLElement>
  ) {}

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

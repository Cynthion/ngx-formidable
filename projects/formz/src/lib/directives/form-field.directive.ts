import {
  Directive,
  ElementRef,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  OnInit,
  Optional,
  Output
} from '@angular/core';
import { NgModel } from '@angular/forms';
import { AbstractFormFieldDirective } from './abstract-form-field.directive';
import { FormFieldType, ICustomFormField } from '../form-model';

/**
 * Directive to enhance form fields (native or custom) with common behaviors:
 * - Automatically generates a unique ID for the form field.
 * - Applies a default CSS class for styling.
 * - Emits coherent 'focusChange' and 'valueChange' events for native and custom elements.
 * - Accepts any host element, native (<input>, <textarea>, <select>) or custom.
 */
@Directive({ selector: '[formzFormField]' })
export class FormFieldDirective extends AbstractFormFieldDirective implements OnInit {
  @Input() fieldType: FormFieldType = 'field';

  // auto-apply the form-type specific class to the host element (native or custom)
  @HostBinding('class.field') fieldClass = this.fieldType === 'field';
  @HostBinding('class.group-field') groupFieldClass = this.fieldType === 'option';

  @Output() focusChange = new EventEmitter<boolean>();
  @Output() valueChange = new EventEmitter<string>();

  protected element!: HTMLElement;
  protected elementTag!: string;
  protected isNativeElement = false;

  constructor(
    public elementRef: ElementRef<HTMLElement>,
    @Optional() protected ngModel: NgModel
  ) {
    super();
  }

  ngOnInit(): void {
    this.element = this.elementRef.nativeElement;
    this.elementTag = this.element.tagName.toLowerCase();
    this.isNativeElement = ['input', 'textarea', 'select'].includes(this.elementTag);

    // TODO need to subscribe to focus events of custom controls?
    if (this.ngModel) {
      this.ngModel.valueChanges?.subscribe((value) => {
        this.valueChange.emit(value ?? '');
      });

      // emit the initial value immediately
      const initialValue = this.ngModel.model ?? this.tryGetValue();
      this.valueChange.emit(initialValue);
    } else {
      // fallback: emit current DOM value
      if (!this.isNativeElement) {
        this.listenToHostOutputs();
      }

      this.valueChange.emit(this.tryGetValue());
    }
  }

  /** Listen to value changes of native <input> and <textarea> elements. */
  @HostListener('input')
  onInput(): void {
    if (this.isNativeElement && this.elementTag !== 'select') {
      this.valueChange.emit((this.element as HTMLInputElement | HTMLTextAreaElement).value);
    }
  }

  /** Listen to value changes of native <select> elements. */
  @HostListener('change')
  onChange(): void {
    if (this.isNativeElement && this.elementTag === 'select') {
      this.valueChange.emit((this.element as HTMLSelectElement).value);
    }
  }

  /** Listen to focus changes of native elements. */
  @HostListener('focus')
  onFocus(): void {
    if (this.isNativeElement) {
      this.focusChange.emit(true);
    }
  }

  /** Listen to blur changes of native elements. */
  @HostListener('blur')
  onBlur(): void {
    if (this.isNativeElement) {
      this.focusChange.emit(false);
    }
  }

  private tryGetValue(): string {
    const host = this.element as unknown as ICustomFormField;
    return host?.value ?? '';
  }

  private listenToHostOutputs(): void {
    const host = this.element as unknown as ICustomFormField;

    if (host.valueChange$.subscribe) {
      host.valueChange$.subscribe((value: string) => this.valueChange.emit(value));
    }

    if (host.focusChange$.subscribe) {
      host.focusChange$.subscribe((focused: boolean) => this.focusChange.emit(focused));
    }
  }
}

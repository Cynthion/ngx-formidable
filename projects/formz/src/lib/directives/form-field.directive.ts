import { Directive, OnInit } from '@angular/core';

// TODO move features into different components
/**
 * Directive to enhance form fields (native or custom) with common behaviors:
 * - Automatically generates a unique ID for the form field.
 * - Applies a default CSS class for styling.
 * - Accepts any host element, native (<input>, <textarea>, <select>) or custom.
 */
@Directive({ selector: '[formzFormField]' })
export class FormFieldDirective implements OnInit {
  // auto-generate a unique ID for the form field
  // @HostBinding('attr.id') id = `formz-form-field-${uuid()}`;

  // auto-apply the form-type specific class to the host element (native or custom)
  // @HostBinding('class.field') fieldClass = this.decoratorLayout === 'single';
  // @HostBinding('class.group-field') groupFieldClass = this.decoratorLayout === 'option';

  // @Output() focusChange = new EventEmitter<boolean>();
  // @Output() valueChange = new EventEmitter<string>();

  // protected element!: HTMLElement;
  // protected elementTag!: string;
  // protected isNativeElement = false;

  // constructor(public elementRef: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    // this.element = this.elementRef.nativeElement;
    // this.elementTag = this.element.tagName.toLowerCase();
    // this.isNativeElement = ['input', 'textarea', 'select'].includes(this.elementTag);
    // TODO need to subscribe to focus events of custom controls?
    // if (this.ngModel) {
    //   this.ngModel.valueChanges?.subscribe((value) => {
    //     this.valueChange.emit(value ?? '');
    //   });
    //   // emit the initial value immediately
    //   const initialValue = this.ngModel.model ?? this.tryGetValue();
    //   this.valueChange.emit(initialValue);
    // } else {
    //   // fallback: emit current DOM value
    //   if (!this.isNativeElement) {
    //     this.listenToHostOutputs();
    //   }
    //   this.valueChange.emit(this.tryGetValue());
    // }
  }

  // TODO move these into native wrappers
  // /** Listen to value changes of native <input> and <textarea> elements. */
  // @HostListener('input')
  // onInput(): void {
  //   if (this.isNativeElement && this.elementTag !== 'select') {
  //     this.valueChange.emit((this.element as HTMLInputElement | HTMLTextAreaElement).value);
  //   }
  // }

  // /** Listen to value changes of native <select> elements. */
  // @HostListener('change')
  // onChange(): void {
  //   if (this.isNativeElement && this.elementTag === 'select') {
  //     this.valueChange.emit((this.element as HTMLSelectElement).value);
  //   }
  // }

  // /** Listen to focus changes of native elements. */
  // @HostListener('focus')
  // onFocus(): void {
  //   if (this.isNativeElement) {
  //     this.focusChange.emit(true);
  //   }
  // }

  // /** Listen to blur changes of native elements. */
  // @HostListener('blur')
  // onBlur(): void {
  //   if (this.isNativeElement) {
  //     this.focusChange.emit(false);
  //   }
  // }

  // private tryGetValue(): string {
  //   const host = this.element as unknown as IFormzField;
  //   return host?.value ?? '';
  // }

  // private listenToHostOutputs(): void {
  //   const host = this.element as unknown as IFormzField;

  //   if (host.valueChange$.subscribe) {
  //     host.valueChange$.subscribe((value: string) => this.valueChange.emit(value));
  //   }

  //   if (host.focusChange$.subscribe) {
  //     host.focusChange$.subscribe((focused: boolean) => this.focusChange.emit(focused));
  //   }
  // }
}

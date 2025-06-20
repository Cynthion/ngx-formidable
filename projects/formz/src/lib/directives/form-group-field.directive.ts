// import { Directive, ElementRef, EventEmitter, HostBinding, OnInit, Optional, Output } from '@angular/core';
// import { NgModel } from '@angular/forms';
// import { HasValueAndFocusChange } from '../../../../../common/models/forms.model';
// import { AbstractFormFieldDirective } from '../abstract-form-field.directive';

// /**
//  * Directive to enhance form group fields with common behaviors:
//  * - Automatically generates a unique ID for the form group field.
//  * - Applies a default CSS class for styling.
//  */
// @Directive({ selector: '[formzFormGroupField]' })
// export class FormGroupFieldDirective extends AbstractFormFieldDirective implements OnInit {
//   @HostBinding('class.group-field') groupFieldClass = true;

//   // TODO implement?
//   @Output() focusChange = new EventEmitter<boolean>();
//   @Output() valueChange = new EventEmitter<string>();

//   protected element!: HTMLElement;
//   protected isNativeElement = false;

//   constructor(
//     public elementRef: ElementRef<HTMLElement>,
//     @Optional() protected ngModel: NgModel
//   ) {
//     super();
//   }

//   ngOnInit(): void {
//     this.element = this.elementRef.nativeElement;

//     // TODO need to subscribe to focus events of custom controls?
//     if (this.ngModel) {
//       this.ngModel.valueChanges?.subscribe((value) => {
//         this.valueChange.emit(value ?? '');
//       });

//       // emit the initial value immediately
//       const initialValue = this.ngModel.model ?? this.tryGetValue();
//       this.valueChange.emit(initialValue);
//     } else {
//       // fallback: emit current DOM value
//       if (!this.isNativeElement) {
//         this.listenToHostOutputs();
//       }

//       this.valueChange.emit(this.tryGetValue());
//     }
//   }

//   private tryGetValue(): string {
//     const host = this.element as unknown as HasValueAndFocusChange;
//     return host?.value ?? '';
//   }

//   private listenToHostOutputs(): void {
//     const host = this.element as unknown as HasValueAndFocusChange;

//     if (host.valueChange$.subscribe) {
//       host.valueChange$.subscribe((value: string) => this.valueChange.emit(value));
//     }

//     if (host.focusChange$.subscribe) {
//       host.focusChange$.subscribe((focused: boolean) => this.focusChange.emit(focused));
//     }
//   }
// }

// import { ChangeDetectionStrategy, Component, ContentChild } from '@angular/core';
// import { AbstractFormFieldComponent } from '../abstract-form-field.component';
// import { FormGroupFieldDirective } from '../directives/form-group-field.directive';

// @Component({
//   selector: 'formz-form-group-field',
//   templateUrl: './form-group-field.component.html',
//   styleUrls: ['./form-group-field.component.scss'],
//   changeDetection: ChangeDetectionStrategy.OnPush
// })
// export class FormGroupFieldComponent extends AbstractFormFieldComponent {
//   @ContentChild(FormGroupFieldDirective) projectedGroupField?: FormGroupFieldDirective;

//   //#region IFormField

//   override get fieldId(): string | null {
//     return this.projectedGroupField?.id ?? null;
//   }

//   readonly isLabelFloating = false;

//   //#endregion
// }

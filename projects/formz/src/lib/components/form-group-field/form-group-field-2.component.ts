// import { ChangeDetectionStrategy, Component, ContentChild } from '@angular/core';
// import { AbstractFormFieldComponent } from '../abstract-form-field.component';
// import { FormGroupFieldDirective } from '../directives/form-group-field.directive';

// @Component({
//   selector: 'cmp-ui-form-group-field-2',
//   templateUrl: './form-group-field-2.component.html',
//   styleUrls: ['./form-group-field-2.component.scss'],
//   changeDetection: ChangeDetectionStrategy.OnPush
// })
// export class FormGroupField2Component extends AbstractFormFieldComponent {
//   @ContentChild(FormGroupFieldDirective) projectedGroupField?: FormGroupFieldDirective;

//   //#region IFormField

//   override get fieldId(): string | null {
//     return this.projectedGroupField?.id ?? null;
//   }

//   readonly isLabelFloating = false;

//   //#endregion
// }

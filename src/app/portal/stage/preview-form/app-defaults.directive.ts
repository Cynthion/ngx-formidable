import { Directive, inject, untracked } from '@angular/core';
import { FORMIDABLE_DEFAULTS } from '@cynthion/ngx-formidable';
import { FormDefinitionStore } from '../../state/form-definition.store';

/**
 * Provides the Studio's app defaults to the preview form, where a consumer's `provideNgxFormidable` provides
 * them to a whole app — so the stage runs the library's own resolution, and the chrome keeps the library's.
 *
 * A snapshot, taken when the form is created: that is when a field reads its defaults, so the form is
 * rebuilt when they change. `untracked`, because a factory can run inside a template's update pass.
 */
@Directive({
  selector: '[portalAppDefaults]',
  providers: [{ provide: FORMIDABLE_DEFAULTS, useFactory: () => untracked(inject(FormDefinitionStore).appDefaults) }]
})
export class AppDefaultsDirective {}

import { Directive, inject, untracked } from '@angular/core';
import { FORMIDABLE_DEFAULTS, FORMIDABLE_ICONS } from '@cynthion/ngx-formidable';
import { FormDefinitionStore } from '../../state/form-definition.store';
import { STUDIO_ICONS } from './preview-icons';

/**
 * Provides the Studio's app defaults to the preview form, with the form's own `revealOn` and
 * `hideRequiredMarkers` over them, and its icons, where a consumer's `provideNgxFormidable` provides them to
 * a whole app — so the stage runs the library's own resolution, and the chrome keeps the library's.
 *
 * A snapshot, taken when the form is created: that is when a field reads its defaults, so the form is
 * rebuilt when they change. `untracked`, because a factory can run inside a template's update pass.
 */
@Directive({
  selector: '[portalAppDefaults]',
  providers: [
    { provide: FORMIDABLE_DEFAULTS, useFactory: () => untracked(inject(FormDefinitionStore).previewDefaults) },
    {
      provide: FORMIDABLE_ICONS,
      useFactory: () => (untracked(inject(FormDefinitionStore).customIcons) ? STUDIO_ICONS : {})
    }
  ]
})
export class AppDefaultsProvider {}

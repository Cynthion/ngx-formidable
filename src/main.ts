import { provideZoneChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideNgxFormidable } from '@cynthion/ngx-formidable';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    // Angular 21 made zoneless the default. This keeps the demo zone-based, which every field still
    // relies on; it is what Phase 15d removes once the library no longer needs zone patching.
    provideZoneChangeDetection(),
    ...provideNgxFormidable()
    // {
    //   provide: FORMIDABLE_ERROR_TRANSLATOR,
    //   useFactory: () => (key: string) => `${key} (translated)`
    // }
  ]
}).catch(console.error);

// import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
// import { AppModule } from './app/app.module';

// platformBrowserDynamic()
//   .bootstrapModule(AppModule)
//   .catch((err: Error) => console.error(err));

import { bootstrapApplication } from '@angular/platform-browser';
import { provideNgxFormidable } from 'ngx-formidable';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    ...provideNgxFormidable()
    // {
    //   provide: FORMIDABLE_ERROR_TRANSLATOR,
    //   useFactory: () => (key: string) => `${key} (translated)`
    // }
  ]
}).catch(console.error);

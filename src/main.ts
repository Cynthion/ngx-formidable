import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withHashLocation } from '@angular/router';
import { provideNgxFormidable } from '@cynthion/ngx-formidable';
import { AppComponent } from './app/app.component';
import { PORTAL_ROUTES } from './app/portal/portal.routes';

bootstrapApplication(AppComponent, {
  providers: [...provideNgxFormidable(), provideRouter(PORTAL_ROUTES, withHashLocation(), withComponentInputBinding())]
}).catch(console.error);

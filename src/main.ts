import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding, withHashLocation } from '@angular/router';
import { provideNgxFormidable } from '@cynthion/ngx-formidable';
import { App } from './app/app';
import { PORTAL_ROUTES } from './app/portal/portal.routes';

bootstrapApplication(App, {
  providers: [...provideNgxFormidable(), provideRouter(PORTAL_ROUTES, withHashLocation(), withComponentInputBinding())]
}).catch(console.error);

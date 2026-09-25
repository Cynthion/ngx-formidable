import { Routes } from '@angular/router';

/**
 * Hash location is what makes these work on the deploy: GitHub Pages serves no SPA fallback, so a
 * path-routed deep link needs an `index.html` copy published as `404.html` and is then served with an HTTP
 * 404 status. The deploy workflow is therefore untouched by the portal.
 */
export const PORTAL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./portal.component').then((m) => m.PortalComponent),
    title: 'ngx-formidable — Studio'
  },
  {
    path: 'specimen',
    loadComponent: () => import('./specimen/specimen-page.component').then((m) => m.SpecimenPageComponent),
    title: 'ngx-formidable — Specimen'
  },
  {
    path: 'docs',
    loadComponent: () => import('./docs/docs-page.component').then((m) => m.DocsPageComponent),
    title: 'ngx-formidable — Docs'
  },
  {
    // A per-token deep link uses a route parameter and scrolls programmatically: a fragment on top of a hash
    // route is ambiguous.
    path: 'docs/:topic',
    loadComponent: () => import('./docs/docs-page.component').then((m) => m.DocsPageComponent),
    title: 'ngx-formidable — Docs'
  },
  {
    // A heading, or a variable's row in the Theme Reference: what the Specimen links to.
    path: 'docs/:topic/:anchor',
    loadComponent: () => import('./docs/docs-page.component').then((m) => m.DocsPageComponent),
    title: 'ngx-formidable — Docs'
  },
  { path: '**', redirectTo: '' }
];

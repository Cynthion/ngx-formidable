import { Provider } from '@angular/core';
import { NgxMaskConfig, provideNgxMask } from 'ngx-mask';
import { FORMIDABLE_MASK_DEFAULTS } from './models/formidable.model';

/** Library-wide setup, all of it optional. */
export interface NgxFormidableConfig {
  /** App-wide ngx-mask defaults, which any field's own `maskConfig` still overrides. */
  globalMaskConfig?: Partial<NgxMaskConfig>;
}

/**
 * Registers the library's providers, ngx-mask included. Call it once in `bootstrapApplication`, or through
 * `NgxFormidableModule.forRoot()` in an NgModule app.
 *
 * It provides no validator. Fields and forms work without one; to validate, provide `FORMIDABLE_VALIDATOR`
 * on the form — the Vest adapter from the `vest` entry point, or an `IFormidableValidator` of your own.
 */
export function provideNgxFormidable(config: NgxFormidableConfig = {}): Provider[] {
  return [
    // Register ngx-mask once for consumers (standalone or module)
    provideNgxMask(),
    // library-wide defaults/tokens
    { provide: FORMIDABLE_MASK_DEFAULTS, useValue: config.globalMaskConfig ?? {} }
  ];
}

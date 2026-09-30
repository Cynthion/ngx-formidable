import { Provider } from '@angular/core';
import { NgxMaskConfig, provideNgxMask } from 'ngx-mask';
import { FORMIDABLE_DEFAULTS, FORMIDABLE_MASK_DEFAULTS, FormidableDefaults } from './models/formidable.model';

/** Library-wide setup, all of it optional. */
export interface NgxFormidableConfig {
  /** App-wide ngx-mask defaults, which any field's own `maskConfig` still overrides. */
  globalMaskConfig?: Partial<NgxMaskConfig>;
  /** App-wide defaults for label position, adornment alignment, panel position, reveal and required marker. */
  defaults?: FormidableDefaults;
}

/**
 * Registers the library's providers, ngx-mask included. Call it once in `bootstrapApplication`, or list it
 * in the root module's `providers` in an NgModule app.
 *
 * It provides no validator. Rules belong to the forms API the fields are bound through.
 */
export function provideNgxFormidable(config: NgxFormidableConfig = {}): Provider[] {
  return [
    // Register ngx-mask once for consumers (standalone or module)
    provideNgxMask(),
    // library-wide defaults/tokens
    { provide: FORMIDABLE_MASK_DEFAULTS, useValue: config.globalMaskConfig ?? {} },
    { provide: FORMIDABLE_DEFAULTS, useValue: config.defaults ?? {} }
  ];
}

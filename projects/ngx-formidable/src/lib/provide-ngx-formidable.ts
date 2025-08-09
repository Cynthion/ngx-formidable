import { Provider } from '@angular/core';
import { NgxMaskConfig, provideNgxMask } from 'ngx-mask';
import { FORMIDABLE_MASK_DEFAULTS } from './models/formidable.model';

export interface NgxFormidableConfig {
  globalMaskConfig?: Partial<NgxMaskConfig>;
}

export function provideNgxFormidable(config: NgxFormidableConfig = {}): Provider[] {
  return [
    // Register ngx-mask once for consumers (standalone or module)
    provideNgxMask(),
    // library-wide defaults/tokens
    { provide: FORMIDABLE_MASK_DEFAULTS, useValue: config.globalMaskConfig ?? {} }
  ];
}

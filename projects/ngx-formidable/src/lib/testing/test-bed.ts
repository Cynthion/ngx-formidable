import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed, TestModuleMetadata } from '@angular/core/testing';
import { provideNgxMask } from 'ngx-mask';
import { clearTheme } from './dom';

/**
 * Configures the testing module the way an application runs the library — zoneless, with ngx-mask — plus
 * whatever the spec adds. It first clears what an earlier spec left on the page: a theme and a scroll.
 */
export function configureFormidableTestBed(metadata: TestModuleMetadata = {}): TestBed {
  clearTheme();
  // An opening panel scrolls itself into view, and a page left scrolled breaks every hit test after it.
  window.scrollTo(0, 0);

  return TestBed.configureTestingModule({
    ...metadata,
    providers: [provideZonelessChangeDetection(), provideNgxMask(), ...(metadata.providers ?? [])]
  });
}

/**
 * Lets an act land: timers of up to `ms`, the frame after them, what a `ResizeObserver` reported in that
 * frame, and the change detection all of it scheduled. It never calls `detectChanges()`, so whatever
 * repaints was marked by the library itself.
 */
export async function settle(fixture: ComponentFixture<unknown>, ms = 0): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
  await fixture.whenStable();
  await new Promise(requestAnimationFrame);
  // An observer delivers after the frame's own callbacks, so only a task queued inside the frame follows it.
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
}

/**
 * Why a spec needing a directive validator — `required` or `minlength` beside a bare `ngModel` — is skipped:
 * `@angular/forms` 22.2 binds a field through its `value` model and on that path never attaches a
 * directive's validators to the control.
 */
export const DIRECTIVE_VALIDATORS_UNATTACHED = 'Angular 22.2 attaches no directive validator to a custom control';

import { effect, untracked } from '@angular/core';

/**
 * Runs `work` whenever what `source` reads changes, but not on the first run. Call it from an injection context.
 *
 * `work` runs untracked, so what it reads does not become a dependency and a write inside it cannot loop.
 */
export function onSignalChange(source: () => void, work: () => void): void {
  let isFirstRun = true;

  effect(() => {
    source();

    if (isFirstRun) {
      isFirstRun = false;
      return;
    }

    untracked(work);
  });
}

import { WritableSignal } from '@angular/core';

/** How long the copy controls say `Copied` before going back to naming what they copy. */
const CONFIRMATION_MS = 1600;

/**
 * Copies text and flips a signal for as long as the confirmation shows.
 *
 * A denied clipboard is not a failure worth a dialog: every caller has the text on screen to select, which
 * is the fallback the permission prompt itself suggests.
 */
export async function copyText(text: string, confirmation: WritableSignal<boolean>): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    confirmation.set(true);
    setTimeout(() => confirmation.set(false), CONFIRMATION_MS);
  } catch {
    // Nothing to report: the text is on screen to select.
  }
}

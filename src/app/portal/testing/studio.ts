import { provideZonelessChangeDetection, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNgxMask } from 'ngx-mask';
import { onTestFinished } from 'vitest';
import { Locator, page, userEvent } from 'vitest/browser';
import { Portal } from '../portal';
import { PORTAL_ROUTES } from '../portal.routes';

/** Wide enough for the two-column layout, where the editor panel sits beside the stage rather than over it. */
export const WIDE = { width: 1440, height: 900 } as const;

interface Viewport {
  readonly width: number;
  readonly height: number;
}

/**
 * A page of the portal as a visitor lands on it: nothing remembered, and the two-column layout. The theme
 * comes off `:root`, and the page is destroyed, when the test ends.
 */
export async function openPage<T>(component: Type<T>, viewport: Viewport = WIDE): Promise<ComponentFixture<T>> {
  localStorage.clear();
  window.scrollTo(0, 0);
  await page.viewport(viewport.width, viewport.height);

  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideNgxMask(), provideRouter(PORTAL_ROUTES)]
  });

  const fixture = TestBed.createComponent(component);

  onTestFinished(() => {
    fixture.destroy();
    document.documentElement.removeAttribute('style');
    localStorage.clear();
  });

  await settle(fixture);

  return fixture;
}

/** The Studio, the page at the portal's root route. */
export function openStudio(viewport: Viewport = WIDE): Promise<ComponentFixture<Portal>> {
  return openPage(Portal, viewport);
}

/**
 * Lets an act land: timers of up to `ms`, a frame, and the change detection they scheduled. It never calls
 * `detectChanges()`, so whatever repaints was marked by the page itself.
 */
export async function settle(fixture: ComponentFixture<unknown>, ms = 0): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
  await fixture.whenStable();
  await new Promise(requestAnimationFrame);
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
}

/** The editor panel's tab, or the tab of the second-level strip under it, by its label. */
export function tab(label: string, strip = 'Editor panel'): Locator {
  return page.getByRole('tablist', { name: strip }).getByRole('tab', { name: label, exact: true });
}

/**
 * Opens one view of the editor panel the way a visitor does: its tab, then the half of it, then for the
 * Settings half the scope the editor applies to.
 */
export async function openPanel(
  area: 'Theme' | 'Form' | 'Import & Export',
  half?: string,
  scope?: string
): Promise<void> {
  const strips = {
    'Theme': 'Theme sections',
    'Form': 'Form sections',
    'Import & Export': 'Import and export sections'
  };

  await userEvent.click(tab(area));
  if (half) await userEvent.click(tab(half, strips[area]));
  // A scope's name carries the count of what it reaches.
  if (scope) await userEvent.click(page.getByRole('button', { name: new RegExp(`^${scope}`) }));
}

/** Opens one accordion section, leaving it open if it already is. */
export async function openSection(heading: string): Promise<void> {
  // A heading's name runs on into its step number before it and its hint after it.
  const trigger = page.getByRole('heading', { name: new RegExp(`^(\\d )?${heading}`) }).getByRole('button');

  if (trigger.element().getAttribute('aria-expanded') !== 'true') await userEvent.click(trigger);
}

/** Picks a field on the Settings half's field picker, by the label it shows on the stage. */
export async function editField(label: string): Promise<void> {
  const picker = page.getByRole('combobox', { name: 'Field', exact: true });
  const option = Array.from((picker.element() as HTMLSelectElement).options).find((candidate) =>
    candidate.text.startsWith(`${label} — `)
  );

  await userEvent.selectOptions(picker, option!.value);
}

/** Opens the model drawer at one of its views, if it is not already showing it. */
async function openDrawer(view: 'By Section' | 'Errors' | 'Raw'): Promise<void> {
  const bar = page.getByRole('button', { name: /^Model / });

  const tab = page.getByRole('tab', { name: view, exact: true });

  // Left alone once it shows the view, so a read in a poll takes no focus from the field under test.
  if (bar.element().getAttribute('aria-expanded') !== 'true') await userEvent.click(bar);
  if (tab.element().getAttribute('aria-selected') !== 'true') await userEvent.click(tab);
}

/** The model as the drawer's `Raw` view states it, dates as ISO strings. */
export async function model(): Promise<Record<string, unknown>> {
  await openDrawer('Raw');

  return JSON.parse(document.querySelector('portal-model-drawer .raw')!.textContent!) as Record<string, unknown>;
}

/** The messages the drawer's `Errors` view lists, by the model path they report on, `Whole Form` included. */
export async function errors(): Promise<Record<string, string[]>> {
  await openDrawer('Errors');

  return Object.fromEntries(
    Array.from(document.querySelectorAll('portal-model-drawer .entry'), (entry) => [
      entry.querySelector('dt')!.textContent!.trim(),
      Array.from(entry.querySelectorAll('.message'), (message) => message.textContent!.trim())
    ])
  );
}

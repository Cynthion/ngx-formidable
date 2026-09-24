/**
 * The SVGs the preview projects into the library's slots. The library ships no icons, so everything about
 * projected markup — size, colour, hover feedback — belongs to the page that projects it.
 */

const STROKE = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

export const CALENDAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${STROKE}>
  <path d="M8 2v4" />
  <path d="M16 2v4" />
  <path d="M3 10h18" />
  <path d="M21 6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z" />
</svg>`;

export const MARKER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${STROKE}>
  <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
  <circle cx="12" cy="10" r="2.5" />
</svg>`;

export const SPARK_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${STROKE}>
  <path d="M12 3v4" />
  <path d="M12 17v4" />
  <path d="M3 12h4" />
  <path d="M17 12h4" />
  <path d="M6 6l2.5 2.5" />
  <path d="M15.5 15.5 18 18" />
  <path d="M18 6l-2.5 2.5" />
  <path d="M8.5 15.5 6 18" />
</svg>`;

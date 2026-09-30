/**
 * HTML imported as text, `with { loader: 'text' }`. The golden export's spec reads its template this way, to
 * compare it with what the Studio writes.
 */
declare module '*.html' {
  const content: string;
  export default content;
}

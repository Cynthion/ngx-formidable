/**
 * Markdown imported as text.
 *
 * `angular.json` maps `.md` to esbuild's `text` loader for both the application and the test target, which
 * is what lets the docs route render `.documentation/user/*.md` itself rather than carry a second copy of
 * it. Nothing is fetched at runtime, so the deploy stays a static bundle.
 */
declare module '*.md' {
  const content: string;

  export default content;
}

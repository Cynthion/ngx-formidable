# Repository Invariants

Always in effect. Area conventions load automatically for the files they apply to.

## Safety

- Never commit an npm token or any other credential.
- Never hand-edit build output: `dist/`, and the `README.md` and `LICENSE` that `prebuild:lib` copies into `projects/ngx-formidable/`.
- Never hand-edit `assets/ladder.png`. It is regenerated with `npm run screenshots`.

## Running Servers

- Reuse a server that is already listening. The portal is served on port 4200.
- Never kill or restart a server you did not start. If nothing is listening, ask rather than starting one.
- Clean up only your own headless browser instance.

## Change Shape

- Prefer the smallest change that matches nearby code.
- Prefer extending an existing helper, base directive or component over adding a new one.
- Do not reformat files unrelated to the task.

## Where Things Live

- **Index**: repository knowledge is indexed by `.documentation/README.md`.
- **Definition Of Done**: `.documentation/impl/definition-of-done.md`.
- **AI Setup**: `.documentation/impl/ai-harness.md`.

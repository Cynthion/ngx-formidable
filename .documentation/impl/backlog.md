# Backlog

## Bugs

## Features

- **Align Signal API With EnerQi**: [`impl/components.md`](components.md) describes the signal API as loose bullets under "Inputs, Outputs And Observables". EnerQi's `impl/components.md` has a Signal API table enforced by lint. Doing only the doc would describe rules the code breaks: [`eslint.config.js`](../../eslint.config.js) has none of the rules (`prefer-signals`, `prefer-signal-model`, `prefer-output-emitter-ref`, `prefer-output-readonly`, `no-uncalled-signals`, `reactive-context-must-read-signal`, `prefer-host-metadata-property`, `prefer-self-closing-tags`, `prefer-class-binding`, `prefer-style-binding`), and `field-decorator.component.ts`, `field-option.component.ts` and `field-hint.directive.ts` still use `@HostBinding`, and their templates use `ngClass`. Scope: (1) replace the bullets with the table, but keep the library-only entries (`onSignalChange()`, the Two Writers `linkedSignal` rule, `$` naming); (2) add the lint rules; (3) move `@HostBinding` to `host` metadata and `ngClass` to `[class]`. Keep Placement, Field Contract and Class Naming. Leave out EnerQi's app-only parts (Containers/Store, Compositions vs Leaves, Storybook). Prove it with lint, tests and a portal screenshot.

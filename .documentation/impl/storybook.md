# Storybook

Every published component has a story file. Stories are written in Component Story Format 3 (CSF3), and every story file gets a docs page. A story is one state of one component, which is what a visual regression run compares, see **Storybook Visual Regression** in [`impl/backlog.md`](backlog.md).

## Setup

| File                                 | Holds                                                                         |
| :----------------------------------- | :---------------------------------------------------------------------------- |
| `.storybook/main.ts`                 | Story glob, addons, framework, components manifest, telemetry off             |
| `.storybook/preview.ts`              | `provideNgxFormidable()` for every story, `autodocs` tag, sidebar order       |
| `.storybook/preview.scss`            | The shipped theme, and the page font a field inherits                         |
| `.storybook/tsconfig.json`           | The type check of `.storybook/`, every `*.stories.ts` and `lib/storybook/`    |
| `src/lib/storybook/story.helpers.ts` | What more than one story file uses, see **Story Helpers**                     |
| `angular.json`, `ngx-formidable`     | `storybook` and `build-storybook` targets                                     |
| `package.json`                       | `storybook` serves on port `6006`; `build-storybook` type-checks, then builds |

`.storybook/` and `src/` paths are relative to `projects/ngx-formidable/`.

- **Framework**: `@storybook/angular-vite` builds with Vite and reads component metadata from the TypeScript source, so Compodoc is not installed. The Vite build strips types without checking them, so `build-storybook` runs `tsc -p .storybook/tsconfig.json --noEmit` first.
- **Zoneless**: stories run zoneless, as the library and the portal do. A component that goes stale in its story is missing a change-detection notification, which is a defect in the component, not in Storybook.
- **Theme**: `preview.scss` loads the shipped theme, so a story paints with the real `:root` variables. A field takes the page's font family, so it also sets one on `body`, as every consumer's page does. A story never overrides a `--formidable-*` variable; themes are the portal's.
- **Not Published**: `public-api.ts` reaches no story and nothing in `lib/storybook/`, and `tsconfig.lib.json` excludes both, so neither reaches the package.
- **Docs Pages**: the global `autodocs` tag gives every component a docs page. It shows the JSDoc comment above `meta` as the component description, the JSDoc comment above each story as the story description, and a props table read from the component source.
- **MCP**: `@storybook/addon-mcp` serves the running Storybook's component docs and stories to agents at `http://localhost:6006/mcp`, from the manifest `features.componentsManifest` enables. Its `dev` toolset is off: with it on, the server tells every agent to treat that toolset's generic story instructions as the source of truth, and they contradict this document, for example by passing `fn()` in `args`. `.mcp.json` registers it as `storybook`, see [`impl/ai-harness.md`](ai-harness.md#mcp-servers).
- **Lint**: `npm run lint` applies `eslint-plugin-storybook`'s `flat/recommended` rules to every `*.stories.ts`.
- **CI**: `ci.yml` runs `npm run build-storybook`, so a story that does not compile fails the build.

---

## Story File

```ts
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { decorated, decoratedImports, mockRequiredError } from '../../../storybook/story.helpers';
import { InputField } from './input-field';

/** One line of text, optionally masked. */
const meta: Meta<InputField> = {
  title: 'Fields / Input Field',
  component: InputField,
  decorators: [decoratedImports],
  argTypes: { valueChange: { action: 'valueChange' }, touch: { action: 'touch' } },
  args: { placeholder: 'Ada Lovelace' },
  render: decorated('formidable-input-field', 'Name')
};

export default meta;
type Story = StoryObj<InputField>;

export const Default: Story = {};

export const StateInvalid: Story = {
  args: { required: true, touched: true, invalid: true, errors: mockRequiredError }
};

/** The model holds the raw digits; the mask formats what is shown. */
export const Masked: Story = {
  args: { value: '4111111111111111', mask: '0000 0000 0000 0000' }
};
```

- **Location**: `<name>.stories.ts` sits beside the component's `<name>.ts`.
- **Imports**: relative paths, never `@cynthion/ngx-formidable`. The framework does not map the `tsconfig` `paths` alias.
- **Format**: `meta` is typed `Meta<Component>` and exported as default. `type Story = StoryObj<Component>`. Every named export is one story of one variant.
- **File Order**: imports, story-local data, `meta`, `export default meta`, `type Story`, stories.
- **Property Order**: `title`, `component`, `decorators`, `parameters`, `argTypes`, `args`, `render`, `play`. A story keeps the same order.
- **Exports**: PascalCase. The baseline story of a file is `Default`. A variant of one input is named `<Input><Value>`, for example `PanelPositionSheet`, `EmptyHintFormat`. A forms state is `State<Name>`, for example `StateDisabled`.
- **Story Names**: Storybook derives the name from the export, `PanelPositionSheet` becomes `Panel Position Sheet`. `name` is not set.
- **Notes**: a non-obvious variant is explained in a JSDoc comment above its export, a component-wide note in a JSDoc comment above `meta`. Both render as Markdown on the docs page.

---

## Titles

| Component Location              | Title                            |
| :------------------------------ | :------------------------------- |
| `lib/components/fields/<name>/` | `Fields / <Name>`                |
| `lib/components/<name>/`        | `Structural Components / <Name>` |

- **Name**: the class name, words separated by spaces. `RadioGroupField` becomes `Radio Group Field`.
- **Directives**: the decoration directives have no story file of their own. Each is a story of the component it decorates: label position, prefix and suffix alignment, hint alignment and the label adornment on `Field Decorator`, the toggle icon on `Date Field`.
- **Sidebar Order**: `storySort` in `preview.ts` puts `Fields` before `Structural Components`, each alphabetical.

---

## Coverage

- **Fields**: `Default`, `Filled`, `StateDisabled`, `StateReadonly`, `StateRequired` and `StateInvalid`, plus one story per value of each input that changes what the field looks like, such as `PanelPositionSheet` or `EmptyHintFormat`. An input that changes only behaviour, such as `sortFn`, gets no story.
- **Field Decorator**: one story per `FieldLabel` `position`, per non-default `FieldPrefix` and `FieldSuffix` `align`, per `FieldHint` `align`, one with a label adornment, and one per non-`horizontal` layout. Each renders the field empty and filled, so a label that rests while empty and floats once filled shows both states. Its args are the slots' contents and options, since the decorator has no inputs.
- **Field Option**: one story per `layout`, each listing a `readonly` and a `disabled` option, and one with projected content.
- **Field Errors**: one error, several, and one without a `message`.
- **Panels**: a story of an open panel opens it in `play` from the keyboard, the way a user does, so its picture is the panel a user sees.

---

## Args And Rendering

- **Decorated**: a field story renders the field inside `formidable-field-decorator` with a `formidableFieldLabel`, as a consumer uses it. Undecorated, a field has no accessible name and no label to lay out.
- **Forms State Through Inputs**: a story sets `disabled`, `readonly`, `required`, `invalid`, `touched`, `errors` and `pending` through the field's inputs. No story binds a forms API; `field-contract.spec.ts` covers that.
- **Shared Args**: args every story shares sit on `meta`. A story sets only what differs and never spreads another story or its args.
- **Defaults**: `meta.args` does not repeat an input's default. A variant story may set it to name the variant.
- **Outputs**: every output of the component is declared in `meta.argTypes` as `{ action: '<output>' }`, so the Actions panel logs it and a play function can assert on it. `fn()` in `args` is not used. A callback inside an arg, such as an action option's `action`, logs through `action('<name>')` from `storybook/actions`.
- **Shared Render**: the `render` that most stories share sits on `meta`. A story declares its own `render` only for a different composition.
- **Bindings**: a template binds the component's args with `argsToTemplate(args)`, which skips undefined args so that inputs keep their defaults.
- **Story-Only Values**: a value a template needs that is not an input goes into `props` next to `args`, never into `args`.
- **No Name Clashes**: an arg never shares its name with a member of `component`. Where the template's root element is that component, Storybook writes the args onto its instance, and a getter of the same name throws.
- **Play Functions**: an interaction is a `play` function driving the context's `userEvent`, with `expect` from `storybook/test`. Every interaction is awaited, which the lint rules enforce.

---

## Decorators And Parameters

- **Imports**: the story's `component` is imported automatically. `moduleMetadata({ imports: [...] })` lists only what a custom template uses besides it. `declarations` is never used.
- **Application Providers**: `preview.ts` provides `provideNgxFormidable()`. `applicationConfig(...)` is used only to provide `FORMIDABLE_DEFAULTS` or `FORMIDABLE_ERROR_MESSAGE` for one file.
- **Layout**: fields fill their container's width, so stories keep Storybook's default `padded`, which is never declared.
- **Docs Rendering**: docs pages render stories inline. A story whose open panel overflows the story's height, or pins itself to the viewport as a `sheet` does, renders in a frame with `parameters: framed`.

---

## Story Helpers

`lib/storybook/story.helpers.ts` holds what more than one story file uses. A value used by a single story file stays in that file.

| Export                       | Does                                                                                        |
| :--------------------------- | :------------------------------------------------------------------------------------------ |
| `decorated(selector, label)` | A `render` of the field bound to the story's args, inside a decorator under `label`         |
| `decoratedImports`           | The `moduleMetadata` that `decorated()`'s template needs                                    |
| `openPanel(keys, type)`      | A `play` that tabs into the field, types `type` and presses `keys`, `Arrow Down` by default |
| `framed`                     | The `parameters` that render a story in a frame on its docs page                            |
| `mockColourOptions`, `mock*` | Shared data. Every data export is prefixed with `mock`                                      |

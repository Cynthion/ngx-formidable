# Contributing

Contributions are welcome. This repository is an Angular workspace holding two projects: the publishable library in `projects/ngx-formidable/`, and the demo app in `src/` that showcases it.

## Getting Set Up

```bash
npm install       # from the workspace root — never from inside projects/ngx-formidable
npm start         # serve the demo at http://localhost:4200
```

A nested `projects/ngx-formidable/node_modules` shadows the root install with a second copy of `@angular/core` and breaks the test runner. If you have one, delete it and install from the root.

## Scripts

| Script                   | Does                                                     |
| :----------------------- | :------------------------------------------------------- |
| `npm start`              | Serve the demo app                                       |
| `npm run build`          | Build the demo app                                       |
| `npm run build:lib`      | Build the library, which is also the type/template check |
| `npm test`               | Run the tests                                            |
| `npm run lint`           | ESLint over the library sources                          |
| `npm run style-lint`     | Stylelint over the library SCSS                          |
| `npm run prettier:check` | Formatting check across the repo                         |

There is no standalone typecheck script — `build:lib` is it.

## Making A Change

1. **Fork** the repository and branch off `main` as `feature/*`.
2. **Read the conventions** in `.documentation/impl/conventions.md` before writing code: selectors, standalone/OnPush, the field contract, naming, and the Ubiquitous Language table that keeps one name per concept.
3. **Write the code**, following the surrounding style rather than introducing your own.
4. **Exercise it in the demo.** `example-form` is the showcase and the only visual test surface; a new field component is wired into it so it renders and can be tried.
5. **Add tests** per `.documentation/impl/testing.md` — helpers first, colocated with the code they pin down.
6. **Update the docs.** A public API change belongs in `.documentation/user/components.md`; a change to public usage belongs in the matching `.documentation/user/*.md`; a design decision belongs in the matching `.documentation/tech/*.md`. The root `README.md` changes only when public usage does.
7. **Run every check** in the Scripts table above and make them pass.
8. **Open a pull request** describing what changed and why.

## Documentation

Documentation lives in `.documentation/`, split by audience: `user/` for consumers, `tech/` for maintainers, `impl/` for whoever works the repo. The index is `.documentation/README.md` and the authoring rules are in `.documentation/impl/documentation.md` — read them before editing any markdown, since the style is enforced by review rather than by a linter.

## Definition Of Done

A change is done when it meets every item of the Definition of Done in `.documentation/impl/conventions.md`. That is the authoritative list; this file only points at it.

## Reporting Bugs

Open an issue at <https://github.com/Cynthion/ngx-formidable/issues> with the Angular version, a description of the expected and actual behaviour, and a reproduction — a StackBlitz, or the smallest template and component that shows it.

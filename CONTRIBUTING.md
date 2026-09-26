# Contributing

Contributions are welcome. This repository is an Angular workspace holding two projects: the publishable library in `projects/ngx-formidable/`, and the portal in `src/` that showcases it.

## Making A Change

1. **Fork** the repository and branch off `main` as `feature/*`.
2. **Set up** the toolchain and install per [`.documentation/impl/developer-onboarding.md`](.documentation/impl/developer-onboarding.md).
3. **Read the conventions** before writing code — they are listed under `General` in the Definition of Done — and follow the surrounding style rather than introducing your own.
4. **Meet the Definition of Done** in [`.documentation/impl/definition-of-done.md`](.documentation/impl/definition-of-done.md): tests, the portal showcase, documentation, and every check. CI runs the same checks on your pull request.
5. **Open a pull request** describing what changed and why.

## Documentation

Documentation lives in `.documentation/`, split by audience: `user/` for consumers, `tech/` for maintainers, `impl/` for whoever works the repository. The index is [`.documentation/README.md`](.documentation/README.md) and the authoring rules are in [`.documentation/impl/documentation.md`](.documentation/impl/documentation.md) — read them before editing any Markdown. `npm run docs:lint` checks style and links.

## Reporting Bugs

Open an issue on [GitHub Issues](https://github.com/Cynthion/ngx-formidable/issues) with the Angular version, a description of the expected and actual behaviour, and a reproduction — a StackBlitz, or the smallest template and component that shows it.

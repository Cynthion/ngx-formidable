# Implementation Roadmap

The source of truth for outstanding work. `impl/backlog.md` is the raw intake buffer for new, untriaged ideas; this file is where they land once they are ordered into phases.

- **One Phase, One Conversation**: phases are sized to be finished in a single session. Do not merge them.
- **Delete On Ship**: when a phase ships, its entry here is **deleted**, not annotated — only the `Already Shipped` row survives. See the Definition of Done in `impl/conventions.md`.
- **No Silent Reordering**: a phase's dependencies are listed with it. Do not start a phase whose dependencies are open.

## Ordering Strategy

- **Bugs First**: defects lead, whichever section they came in under.
- **State Before Style**: the invalid-state hook was a prerequisite for both border geometry and `aria-invalid`, and shipped ahead of them.
- **Docs Last**: API documentation and the `README.md` pass come after the API stops moving.
- **Portal After The Library**: the portal must expose every field option and theme token, so it starts only once those are stable.

---

## Library Phases

### Signal Forms

### Documentation Update

- Check the whole documentation against the updated convention.
- Update the whole source code comments against the updated convention. (Also, it is outdated in a lot of places. Library is now Angular v22+)

### Architecture Review

### Phase 17 — Release

- **Tag**: tag the release commit. Final step.

### Phase 18 — Storybook

- **Set It Up**: Storybook is not installed. Take conventions from the sibling project's `storybook.md` and its `.storybook` configuration first. Copy it into this repo from EnerQi repository.
- **Stories**: all components, including the layout options.
- demonstrate all fields, directives and decorator, including their properties.

### Phase 19 — Date Range Field

- **The Calendar Is Not The Problem**: the backlog assumed Pikaday could not do ranges. It renders them — `startRange` / `endRange` options and `is-inrange` / `is-startrange` / `is-endrange` classes. What it does not do is manage range _selection_; that is driven from `onSelect`, or with two instances.
- **The Value Contract Is**: `date-field` is single-valued end to end — `Date | null`, one picker, one masked input with one `unicodeTokenFormat`, arrow-stepping over that one date, and `isFilled`. A range mode means a tuple value, a two-segment mask, parse and format path, per-segment arrow-stepping and clear semantics, and range styling that `_pikaday.scss` does not have.
- **Size It Honestly**: the largest single item on this roadmap. Split it before starting.

### Phase 20 — AI Support

I want to support developers to use AI to use this library. How can I do that?
Should that be done with an MCP? What are other ways?

### Phase 21 — Blog Post

- **Where**: `https://thedevexchange.com/`, the company dev blog.
- **What**: the library, its features, and how it is used to build beautiful, functional Angular forms. Code examples, screenshots, links to the portal and the GitHub repository. Why it beats other form libraries, and a call to action to try it.
- **Interview First**: interview me before writing, to get my perspective on the library, its development process and its roadmap. The narrative comes out of that, not out of the code.
- **Tone**: humorous and light, informative and professional. Conversational, so the reader feels part of the journey.
- **Include A Lessons-Learned Section**: the challenges hit during development and how they shaped the library's design. That is what gives readers the thinking behind the features.

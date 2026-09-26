# Ubiquitous Language

One name per concept, in code and in docs. Check a new name against this table before introducing it; a synonym is a defect.

| Concept                                       | Term           | Never                                                          |
| :-------------------------------------------- | :------------- | :------------------------------------------------------------- |
| The object a form edits                       | **model**      | "form value" when the model is meant                           |
| The all-keys-required reference for the model | **shape**      | "frame"                                                        |
| What a rule reports on                        | **target**     | "field path", "control path", "field name" when a target fits  |
| The form as a target                          | **whole form** | "root form", "root-level", "cross-field", "composite"          |
| The pluggable rule runner                     | **validator**  | "adapter", "seam", "bridge", "harness" in consumer-facing text |
| Angular's raw error bag                       | **errors**     | —                                                              |
| The strings a field displays                  | **messages**   | "errors" when the displayed text is meant                      |
| When the validator runs                       | **run**        | "trigger", "mode", "strategy"                                  |
| When the messages appear                      | **reveal**     | "show", "display", "mode", "strategy"                          |
| The application in `src/`                     | **portal**     | "demo", "demo app", "showcase" as a noun for it                |
| The portal's `/` route                        | **Studio**     | "the portal" when the page a visitor themes on is meant        |
| The portal's `/specimen` route                | **Specimen**   | "gallery", "showcase"                                          |

A rule has exactly one target, and its name follows it: a **field rule**, a **group rule** or a **whole-form rule**. "Cross-field" describes what a rule _reads_, never what it reports on — a group rule reading two fields is cross-field, and so is a whole-form rule. Full reference: [`user/validation.md`](../user/validation.md).

**Run** and **reveal** are two axes, not one setting. Run is Angular's `updateOn`, reveal is the library's `revealOn`, and the default pairing is a deliberate mismatch: run on every change, reveal once touched.

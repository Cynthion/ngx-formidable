# Submit Gates

A submit gate decides when the submit button can be pressed. Neither Signal Forms nor the library has one of its own: `[formRoot]` submits whenever the button is pressed, touches every field, and runs the `action` unless a rule fails. A gate is a `computed` over the form's state and the model, bound to the button's `disabled`. How submission itself works is in **Submission** in [Forms](forms.md).

## Choosing A Gate

| Gate              | Opens When                          | Open After A Revert | Open While Invalid |
| :---------------- | :---------------------------------- | :-----------------: | :----------------: |
| None, the default | Always                              |         Yes         |        Yes         |
| Valid             | No rule fails and none is pending   |         Yes         |         No         |
| Dirty             | The user has edited a field         |         Yes         |        Yes         |
| Changed           | The model differs from its baseline |         No          |        Yes         |
| Valid And Changed | Both                                |         No          |         No         |

- **A Closed Button Reveals Nothing**: only a submit touches every field. While the button is closed, a field the user has not left keeps its messages hidden, so a gate that stays closed on an invalid form does not show why. See [A Closed Button And Accessibility](#a-closed-button-and-accessibility).
- **The Action Is The Guard**: an invalid form runs no `action`, gate or not. A gate decides what the user can press, not what reaches the server.
- **Enter Follows The Button**: `Enter` in a text field submits through the form's first submit button, and does nothing while that button is disabled. A gate on the button gates `Enter` too. Which fields keep `Enter` for themselves is in **Keyboard** in [Fields](fields.md).
- **No Double Submit**: a submit while the `action` runs does nothing, gate or not. See [While Submitting](#while-submitting).

---

## The Example

Every gate below extends one form. It edits a saved user, the **baseline**, which the component receives as an input. `UserFormModel`, `initialUserFormModel` and `userSchema` are the ones from [Getting Started](getting-started.md).

```ts
// user.form.ts, beside UserFormModel, initialUserFormModel and userSchema
import { isSameDay } from 'date-fns';

export function isSameUser(a: UserFormModel, b: UserFormModel): boolean {
  return a.name === b.name && a.hobby === b.hobby && isSameDate(a.birthdate, b.birthdate);
}

function isSameDate(a: Date | null, b: Date | null): boolean {
  return a && b ? isSameDay(a, b) : a === b;
}
```

```ts
// user-form.ts
export class UserForm {
  /** The saved user, which the gate compares against. */
  readonly user = input(initialUserFormModel);
  readonly saved = output<UserFormModel>();

  readonly model = linkedSignal(() => this.user());
  readonly form = form(this.model, userSchema, {
    submission: { action: async () => this.saved.emit(this.model()) }
  });

  readonly hasChanges = computed(() => !isSameUser(this.model(), this.user()));
  readonly canSubmit = computed(() => this.form().valid() && this.hasChanges());
}
```

```html
<!-- user-form.html -->
<form [formRoot]="form">
  <!-- fields -->
  <button
    type="submit"
    [disabled]="!canSubmit()">
    Save
  </button>
</form>
```

- **A Baseline Resets The Model**: `linkedSignal` replaces the model whenever a new `user` arrives, such as the user a save returns. Unsaved edits go with it.
- **Compare By Value**: an equality function of your own compares every key the fields write, and an array by its items. `===` on two models compares only their identity.
- **Compare A Date By Its Day**: a date field writes local midnight, see **Dates And Times** in [Fields](fields.md). A saved date that carries a time of day differs by `getTime()` even after an edit and its revert. A time compares by its time of day, for the same reason.

---

## The Gates

Each gate is a different `canSubmit`.

### None

Bind nothing. A submit touches every field, so under the default `touched` reveal every message appears at once, and the user sees what is missing.

### Valid

```ts
readonly canSubmit = computed(() => this.form().valid());
```

**Pending Closes It**: `valid()` is `false` while a rule still runs, such as `validateHttp()`. To keep the button open meanwhile, gate on `!this.form().invalid()`, which stays `true` until a rule fails.

### Dirty

```ts
readonly canSubmit = computed(() => this.form().dirty());
```

- **Dirty Latches**: an edit and its revert leave the form dirty, and so does a new baseline. `this.form().reset()` clears it, for example once a save has succeeded.
- **No Baseline Needed**: it answers whether the user did anything, not whether there is anything to save.

### Changed

```ts
readonly canSubmit = computed(() => this.hasChanges());
```

- **A Revert Closes It**: the gate compares values, so restoring the saved value closes it again.
- **One Signal For The Button And The Route**: an unsaved-changes guard on the route reads the same `hasChanges`, so the button and the guard cannot disagree.

### Valid And Changed

The gate of [The Example](#the-example). The button opens only for a valid form that holds something to save.

---

## While Submitting

`submitting()` is `true` while the `action`'s promise is pending, and a submit meanwhile does nothing. Add it to a gate to show the button closed meanwhile:

```ts
readonly canSubmit = computed(() => this.form().valid() && this.hasChanges() && !this.form().submitting());
```

- **The Action Awaits The Save**: `submitting()` spans only what the `action` awaits. An action that emits an output, as in the example, resolves at once.
- **A Parent That Saves Says So**: when the `action` hands the model to a parent, `submitting()` ends before the save starts, and Signal Forms refuses no second submit. The parent knows when its save runs, so an input of yours carries that to the gate, which is then the only guard:

```ts
readonly saving = input(false);
readonly canSubmit = computed(() => this.form().valid() && this.hasChanges() && !this.saving());
```

---

## A Closed Button And Accessibility

A disabled button leaves the tab order and does not say why it is closed. Pair a closed gate with a hint, such as a line beside the button, or use no gate, whose submit reveals every message.

To keep the button focusable, bind `aria-disabled` instead of `disabled`. The button stays in the tab order and is announced as unavailable, but it still submits, so the `action` checks what Signal Forms does not:

```html
<button
  type="submit"
  [attr.aria-disabled]="!canSubmit() || null">
  Save
</button>
```

```ts
readonly form = form(this.model, userSchema, {
  submission: {
    action: async () => {
      if (this.hasChanges()) this.saved.emit(this.model());
    }
  }
});
```

- **Signal Forms Checks The Rest**: it runs no `action` on an invalid form or during a submission, and the submit still reveals every message.
- **Check The Baseline, Not The Gate**: `submitting()` is already `true` when the `action` starts, so an `action` that checks a `canSubmit()` reading it never saves.
- **Style It Yourself**: `:disabled` no longer matches the button. Select `[aria-disabled='true']` instead.

---

## Related

- [Forms](forms.md): how the fields meet Signal Forms, reactive forms and template-driven forms, and submission
- [Validation](validation.md): Angular's rules, Vest, Zod or none; messages and their reveal
- [Fields](fields.md): options, panels, keyboard, dates and times, masking, focus
- [Getting Started](getting-started.md): install, wiring, the stylesheet, a first form

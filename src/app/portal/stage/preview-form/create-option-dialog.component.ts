import { ChangeDetectionStrategy, Component, effect, ElementRef, input, output, viewChild } from '@angular/core';

/**
 * The process an `actionOption` stands in for: a modal that creates an option the list did not have.
 *
 * A native `<dialog>`, so the focus trap, the `Escape` key and the backdrop are the platform's rather than
 * the portal's. It is deliberately the thinnest thing that can stand for a real one — what it demonstrates is
 * the round trip, not the dialog: the field hands over the text typed into it, and what comes back is an
 * option that did not exist and the value that now points at it.
 */
@Component({
  selector: 'portal-create-option-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './create-option-dialog.component.scss',
  template: `
    <dialog
      #dialogRef
      class="create-dialog"
      (close)="dismissed.emit()">
      <form
        method="dialog"
        (submit)="onSubmit(labelRef.value)">
        <h2>{{ title() }}</h2>
        <p>An option the list did not have. The field asked for it; the page decides what it is.</p>
        <label
          class="create-label"
          for="create-option-label">
          Label
        </label>
        <input
          #labelRef
          id="create-option-label"
          class="create-input"
          type="text"
          required
          [value]="prefill()" />
        <footer>
          <button
            type="button"
            class="ghost"
            (click)="close()">
            Cancel
          </button>
          <button
            type="submit"
            class="primary">
            Add It
          </button>
        </footer>
      </form>
    </dialog>
  `
})
export class CreateOptionDialogComponent {
  /** The text typed into the field before the action was picked. */
  public readonly prefill = input<string | null>(null);
  public readonly title = input('Add An Option');

  public readonly created = output<string>();
  public readonly dismissed = output<void>();

  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialogRef');

  constructor() {
    // `prefill` is the request: a string opens the dialog, `null` closes it. One signal rather than two, so
    // the dialog cannot be open while the form thinks nothing was asked.
    effect(() => {
      const dialog = this.dialogRef().nativeElement;
      const open = this.prefill() !== null;

      if (open && !dialog.open) dialog.showModal();
      if (!open && dialog.open) dialog.close();
    });
  }

  protected close(): void {
    this.dialogRef().nativeElement.close();
  }

  protected onSubmit(label: string): void {
    const trimmed = label.trim();
    if (!trimmed) return;

    this.created.emit(trimmed);
  }
}

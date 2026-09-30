import { Component, computed, inject, input, signal } from '@angular/core';
import { FieldTree, FormRoot } from '@angular/forms/signals';
import { FieldErrors } from '@cynthion/ngx-formidable';
import { fieldAt } from '../../helpers/model-path.helpers';
import { PortalOptionSpec } from '../../model/field-spec.model';
import { FormDefinitionStore } from '../../state/form-definition.store';
import { FormValueStore, PortalModel } from '../../state/form-value.store';
import { InspectorStore } from '../../state/inspector.store';
import { AppDefaultsProvider } from './app-defaults-provider';
import { CreateOptionDialog } from './create-option-dialog';
import { PortalActionRequest, PreviewField } from './preview-field';

/**
 * The preview form itself, rendered from the definition tree over the store's field tree.
 *
 * A field reads its defaults once, when it is created, as it does at bootstrap in a consumer's app — so new
 * defaults rebuild the form, and so does a new field tree. The tree keeps the touched and dirty state rather
 * than the fields, so a rebuild for defaults alone loses none of it.
 */
@Component({
  selector: 'portal-preview-form',
  templateUrl: './preview-form.html',
  styleUrl: './preview-form.scss',
  imports: [FormRoot, FieldErrors, PreviewField, CreateOptionDialog, AppDefaultsProvider]
})
export class PreviewForm {
  protected readonly definitionStore = inject(FormDefinitionStore);
  protected readonly valueStore = inject(FormValueStore);
  protected readonly inspectorStore = inject(InspectorStore);

  public readonly showAccessibility = input(false);
  /** The chips are the portal's annotation of the form, not part of it. */
  public readonly showFieldTypes = input(true);

  protected readonly options = computed(() => this.definitionStore.options());
  protected readonly sections = computed(() => this.definitionStore.sectionsWithFields());
  protected readonly heading = computed(() => this.definitionStore.definition().title);
  protected readonly intro = computed(() => this.definitionStore.definition().intro);
  protected readonly submit = computed(() => this.definitionStore.definition().submit);

  /** A new object whenever the form has to be rebuilt, which is what the template tracks. */
  protected readonly build = computed(() => ({
    form: this.valueStore.form(),
    defaults: this.definitionStore.previewDefaults()
  }));

  /** The field at a model path: `group.name` for a field in a grouped section, the group's name for the group. */
  protected fieldAt(tree: FieldTree<PortalModel>, path: string): FieldTree<unknown> {
    return fieldAt(tree, path);
  }

  protected pathOf(id: string): string {
    return this.definitionStore.pathById().get(id) ?? id;
  }

  /**
   * Selection follows focus only while Form ▸ Settings is showing. Anywhere else, clicking a field uses it
   * rather than selecting it — which is the point: a user adjusting a colour should be able to focus a field
   * to see the focus state without the inspector moving under them.
   */
  protected onFieldFocused(id: string): void {
    const showingFields = this.inspectorStore.tab() === 'form' && this.inspectorStore.formTab() === 'settings';

    if (showingFields) this.definitionStore.select(id);
  }

  /** A chip is a control: it opens the editor panel at the field it names. */
  protected openInInspector(id: string): void {
    this.definitionStore.select(id);
    this.inspectorStore.openFieldSettings();
  }

  // #region Action Option

  /**
   * The process an `actionOption` stands in for, emulated end to end: the field hands over the text typed
   * into it, a dialog turns that into an option the list did not have, and the model is pointed at it.
   *
   * It sits here rather than on the field because both halves of the round trip are the page's, not the
   * field's — the option list is the definition's and the value is the model's, and a field owns neither.
   *
   * `null` is "nothing was asked": the empty string is a legitimate prefill, from a dropdown that has no
   * filter text to offer.
   */
  protected readonly actionPrefill = signal<string | null>(null);
  private actionFieldId: string | null = null;

  protected onActionRequested(request: PortalActionRequest): void {
    this.actionFieldId = request.fieldId;
    this.actionPrefill.set(request.prefill);
  }

  protected onOptionCreated(label: string): void {
    const id = this.actionFieldId;
    if (!id) return;

    const field = this.definitionStore.fields().find((candidate) => candidate.id === id);
    if (!field) return;

    const value = uniqueValue(label, field.options ?? []);

    // The option first, then the value: either order works, because a field re-applies a value it could not
    // place when the options it was missing arrive. This one reads as what happened.
    this.definitionStore.addFieldOption(id, { value, label, subtitle: 'Added from the form' });
    this.fieldAt(this.valueStore.form(), this.pathOf(id))().value.set(value);

    this.closeActionDialog();
  }

  protected closeActionDialog(): void {
    this.actionFieldId = null;
    this.actionPrefill.set(null);
  }

  // #endregion
}

/** A value for a created option: its label, slugged, and suffixed until no option already holds it. */
function uniqueValue(label: string, options: readonly PortalOptionSpec[]): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'option';
  const taken = new Set(options.map((option) => option.value));

  if (!taken.has(base)) return base;

  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix++;

  return `${base}-${suffix}`;
}

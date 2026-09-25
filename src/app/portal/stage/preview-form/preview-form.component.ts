import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  FieldErrorsDirective,
  FormidableFormErrors,
  NgxFormidableFormDirective,
  NgxFormidableGroupValidateDirective,
  NgxFormidableWholeFormValidateDirective
} from '@cynthion/ngx-formidable';
import { NgxFormidableVestValidatorDirective } from '@cynthion/ngx-formidable/vest';
import { readPath } from '../../helpers/model-path.helpers';
import { PortalOptionSpec } from '../../model/field-spec.model';
import { createPreviewValidationSuite, PREVIEW_DEPENDENT_FIELDS } from '../../model/preview-form.validation';
import { FormDefinitionStore } from '../../state/form-definition.store';
import { FormValueStore, PortalModel } from '../../state/form-value.store';
import { InspectorStore } from '../../state/inspector.store';
import { AppDefaultsDirective } from './app-defaults.directive';
import { CreateOptionDialogComponent } from './create-option-dialog.component';
import { PortalActionRequest, PreviewFieldComponent } from './preview-field.component';

/**
 * The preview form itself, rendered from the definition tree.
 *
 * `NgForm` reads its options once, in `ngAfterViewInit`, so a new `updateOn` only reaches the controls when
 * the form is rebuilt — which is what the render flip does. The app defaults flip it too: a field and the form
 * read theirs once, when they are created, as they do at bootstrap in a consumer's app. The form's own
 * `revealOn` deliberately does not flip: it has to be live, or switching it would reset the touched and dirty
 * state it reads.
 */
@Component({
  selector: 'portal-preview-form',
  templateUrl: './preview-form.component.html',
  styleUrl: './preview-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    FieldErrorsDirective,
    NgxFormidableFormDirective,
    NgxFormidableGroupValidateDirective,
    NgxFormidableWholeFormValidateDirective,
    NgxFormidableVestValidatorDirective,
    PreviewFieldComponent,
    CreateOptionDialogComponent,
    AppDefaultsDirective
  ]
})
export class PreviewFormComponent {
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

  protected readonly dependentFields = PREVIEW_DEPENDENT_FIELDS;

  /** Changing the run axis or an app default rebuilds the form; nothing else does. */
  protected readonly formKey = signal(0);
  protected readonly ngFormOptions = computed(() => ({ updateOn: this.options().updateOn }));

  /**
   * One suite per form, built fresh whenever the form is. Read through `validator` rather than `options()`
   * so an unrelated option does not discard the validation state the current form has built up.
   */
  private readonly validator = computed(() => this.options().validator);
  protected readonly suite = computed(() => {
    this.formKey();

    return this.validator() === 'vest' ? createPreviewValidationSuite() : null;
  });

  private lastUpdateOn = this.options().updateOn;
  private lastAppDefaults = this.definitionStore.appDefaults();

  constructor() {
    effect(() => {
      const updateOn = this.options().updateOn;
      const appDefaults = this.definitionStore.appDefaults();

      if (updateOn === this.lastUpdateOn && appDefaults === this.lastAppDefaults) return;

      this.lastUpdateOn = updateOn;
      this.lastAppDefaults = appDefaults;
      this.formKey.update((key) => untracked(() => key + 1));
    });
  }

  protected onModelChange(model: PortalModel): void {
    this.valueStore.setModel(model);
  }

  protected onErrors(errors: FormidableFormErrors): void {
    this.valueStore.errors.set(errors);
  }

  protected onSubmit(): void {
    this.valueStore.submitted.set(true);
  }

  /** By field id, because the model path is `group.name` for a field in an `ngModelGroup` section. */
  protected valueFor(id: string): unknown {
    const path = this.definitionStore.pathById().get(id);

    return (path ? readPath(this.valueStore.model(), path) : null) ?? null;
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

    const path = this.definitionStore.pathById().get(id);
    if (path) this.valueStore.setModel(withValueAt(this.valueStore.model(), path, value));

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

/** One value written into the model by its path, which is `group.name` for a field inside an `ngModelGroup`. */
function withValueAt(model: PortalModel, path: string, value: unknown): PortalModel {
  const [head, tail] = path.split('.');

  if (!tail) return { ...model, [head!]: value };

  return { ...model, [head!]: { ...((model[head!] ?? {}) as PortalModel), [tail]: value } };
}

import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  FormidableFormErrors,
  NgxFormidableFormDirective,
  NgxFormidableWholeFormValidateDirective
} from '@cynthion/ngx-formidable';
import { NgxFormidableVestValidatorDirective } from '@cynthion/ngx-formidable/vest';
import { PREVIEW_DEPENDENT_FIELDS, previewValidationSuite } from '../../model/preview-form.validation';
import { FormDefinitionStore } from '../../state/form-definition.store';
import { FormValueStore, PortalModel } from '../../state/form-value.store';
import { InspectorStore } from '../../state/inspector.store';
import { PreviewFieldComponent } from './preview-field.component';

/**
 * The preview form itself, rendered from the definition tree.
 *
 * `NgForm` reads its options once, in `ngAfterViewInit`, so a new `updateOn` only reaches the controls when
 * the form is rebuilt — which is what the render flip does. `revealOn` deliberately does not flip: it has to
 * be live, or switching it would reset the touched and dirty state it reads.
 */
@Component({
  selector: 'portal-preview-form',
  templateUrl: './preview-form.component.html',
  styleUrl: './preview-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    NgxFormidableFormDirective,
    NgxFormidableWholeFormValidateDirective,
    NgxFormidableVestValidatorDirective,
    PreviewFieldComponent
  ]
})
export class PreviewFormComponent {
  protected readonly definitionStore = inject(FormDefinitionStore);
  protected readonly valueStore = inject(FormValueStore);
  protected readonly inspectorStore = inject(InspectorStore);

  public readonly showAccessibility = input(false);
  /** The caption chips are the portal's annotation of the form, not part of it. */
  public readonly showCaptions = input(true);

  protected readonly options = computed(() => this.definitionStore.options());
  protected readonly sections = computed(() => this.definitionStore.sectionsWithFields());
  protected readonly heading = computed(() => this.definitionStore.definition().title);
  protected readonly intro = computed(() => this.definitionStore.definition().intro);
  protected readonly submit = computed(() => this.definitionStore.definition().submit);

  protected readonly suite = computed(() => (this.options().validator === 'vest' ? previewValidationSuite : null));

  protected readonly dependentFields = PREVIEW_DEPENDENT_FIELDS;

  /** Changing the run axis rebuilds the form; nothing else does. */
  protected readonly formKey = signal(0);
  protected readonly ngFormOptions = computed(() => ({ updateOn: this.options().updateOn }));

  private lastUpdateOn = this.options().updateOn;

  constructor() {
    effect(() => {
      const updateOn = this.options().updateOn;

      if (updateOn === this.lastUpdateOn) return;

      this.lastUpdateOn = updateOn;
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

  protected valueFor(name: string): unknown {
    return this.valueStore.model()[name] ?? null;
  }

  /**
   * Selection follows focus only while Form ▸ Fields is showing. Anywhere else, clicking a field uses it
   * rather than selecting it — which is the point: a user adjusting a colour should be able to focus a field
   * to see the focus state without the inspector moving under them.
   */
  protected onFieldFocused(id: string): void {
    const showingFields = this.inspectorStore.tab() === 'form' && this.inspectorStore.formTab() === 'fields';

    if (showingFields) this.definitionStore.select(id);
  }

  /** A caption chip is a control: it opens the inspector at the field it names. */
  protected openInInspector(id: string): void {
    this.definitionStore.select(id);
    this.inspectorStore.openFields();
  }
}

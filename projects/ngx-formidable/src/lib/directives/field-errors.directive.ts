import {
  AfterViewInit,
  ComponentRef,
  Directive,
  EnvironmentInjector,
  inject,
  Injector,
  OnDestroy,
  Optional,
  ViewContainerRef
} from '@angular/core';
import { NgModel, NgModelGroup } from '@angular/forms';
import { defer, of, Subject, switchMap, takeUntil } from 'rxjs';
import { FieldDecoratorComponent } from '../components/field-decorator/field-decorator.component';
import { FieldErrorsComponent } from '../components/field-errors/field-errors.component';
import { NgxFormidableFormDirective } from '../forms/form.directive';

/**
 * Dynamically instantiates a `<formidable-field-errors>` component for any form control decorated with
 * this `formidableFieldErrors` directive, and synchronizes its display with the host `NgModel` or
 * `NgModelGroup`.
 *
 * - Automatically picks up `NgModel` or `NgModelGroup` from DI
 * - Renders into the surrounding `formidable-field-decorator`'s errors slot when there is one, so the
 *   errors land below the field instead of inside the container that positions its label and prefix;
 *   falls back to rendering beside the host control when the field is used without a decorator
 * - Registers the errors component with that decorator, which is what turns the invalid state into the
 *   `.is-invalid` host class the field and label styling targets. Without a decorator there is no such
 *   host, so a field used on its own gets the errors but not the invalid styling
 * - Marks the errors component for check on every control event, waiting for the parent
 *   NgxFormidableFormDirective to go `idle$` first when there is one. Without it — a field validated by
 *   Angular's own validators, or not at all — the control's events drive the repaint directly
 * - Cleans up component instance on destroy
 *
 * @example
 * ```html
 * <input
 *   ngModel
 *   name="username"
 *   placeholder="Enter username"
 *   formControlName="username"
 *   formidableFieldErrors
 * />
 * ```
 */
@Directive({ selector: '[formidableFieldErrors]', standalone: true })
export class FieldErrorsDirective implements AfterViewInit, OnDestroy {
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly injector = inject(Injector);
  private readonly environmentInjector = inject(EnvironmentInjector);
  // Optional: errors render for any validator, and for none — the harness is not required.
  private readonly formDirective = inject(NgxFormidableFormDirective, { optional: true });
  private readonly destroy$ = new Subject<void>();

  // Element injectors follow the declaring template, so a projected field really does see its decorator.
  private readonly decorator = inject(FieldDecoratorComponent, { optional: true });

  private fieldErrorsComponentRef?: ComponentRef<FieldErrorsComponent>;

  @Optional() private readonly ngModel = inject(NgModel, { optional: true });
  @Optional() private readonly ngModelGroup = inject(NgModelGroup, {
    optional: true,
    self: true
  });

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    this.fieldErrorsComponentRef?.destroy();
  }

  public ngAfterViewInit(): void {
    // The injector stays this directive's either way, so the component resolves the same error translator
    // wherever it is rendered — only the DOM anchor differs.
    this.fieldErrorsComponentRef = (this.decorator?.errorsSlot ?? this.viewContainerRef).createComponent(
      FieldErrorsComponent,
      { injector: this.injector, environmentInjector: this.environmentInjector }
    );

    this.fieldErrorsComponentRef.instance.ngModel = this.ngModel ?? undefined;
    this.fieldErrorsComponentRef.instance.ngModelGroup = this.ngModelGroup ?? undefined;

    // The decorator owns the label and is the ancestor every field's stylesheet reaches with
    // `:host-context(.is-invalid)`, so it is where the flag has to surface.
    this.decorator?.registerErrors(this.fieldErrorsComponentRef.instance);

    // When the form is idle, listen to all events of the ngModel or ngModelgroup
    // and mark the component and its ancestors as dirty. (Allows use of OnPush.)
    // Deferred: an `ngModelGroup` registers its control a microtask after this hook, so resolving it here
    // and now would leave a group's errors component with nothing to repaint on.
    const events$ = defer(() => (this.ngModelGroup?.control ?? this.ngModel?.control)?.events ?? of(null));

    // Async validation leaves the harness PENDING, so its errors are only readable once it settles.
    // Synchronous validators have no such gap, so without a harness the events are already the signal.
    (this.formDirective ? this.formDirective.idle$.pipe(switchMap(() => events$)) : events$)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.fieldErrorsComponentRef?.instance.markForCheck();
        // The field is a sibling of the errors component, so nothing above marks it. Without this its
        // `aria-invalid` would keep whatever it bound on the first pass.
        this.decorator?.projectedField?.markForCheck?.();
      });
  }
}

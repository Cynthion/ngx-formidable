import {
  AfterViewInit,
  ComponentRef,
  Directive,
  EnvironmentInjector,
  inject,
  Injector,
  Input,
  OnDestroy,
  Optional,
  ViewContainerRef
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { NgForm, NgModel, NgModelGroup } from '@angular/forms';
import { defer, EMPTY, merge, Observable, of, startWith, Subject, switchMap, takeUntil } from 'rxjs';
import { FieldDecoratorComponent } from '../components/field-decorator/field-decorator.component';
import { FieldErrorsComponent } from '../components/field-errors/field-errors.component';
import { NgxFormidableFormDirective } from '../forms/form.directive';
import { FormidableReveal } from '../models/validation.model';

/**
 * Put this on the `ngModel` or `ngModelGroup` whose validation messages should render. It renders them into
 * the surrounding `formidable-field-decorator` when there is one, and beside the host control when there is
 * not — so a decorated field needs nothing else to show its errors.
 *
 * `revealOn` decides when they appear. The messages themselves are whatever the connected validator wrote.
 */
// Also the repaint pump for both the messages and the field's `aria-invalid`, and what registers the
// invalid state with the decorator. See `tech/decoration.md`.
@Directive({ selector: '[formidableFieldErrors]', standalone: true })
export class FieldErrorsDirective implements AfterViewInit, OnDestroy {
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly injector = inject(Injector);
  private readonly environmentInjector = inject(EnvironmentInjector);
  // Optional: errors render for any validator, and for none — the form directive is not required.
  private readonly formDirective = inject(NgxFormidableFormDirective, { optional: true });
  private readonly ngForm = inject(NgForm, { optional: true });
  private readonly destroy$ = new Subject<void>();

  /** When this field's messages appear, overriding whatever the form set. */
  @Input() revealOn?: FormidableReveal;

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
    this.fieldErrorsComponentRef.instance.revealOn = this.revealOn;

    // The decorator owns the label and is the ancestor every field's stylesheet reaches with
    // `:host-context(.is-invalid)`, so it is where the flag has to surface.
    this.decorator?.registerErrors(this.fieldErrorsComponentRef.instance);

    // When the form is idle, listen to all events of the ngModel or ngModelgroup
    // and mark the component and its ancestors as dirty. (Allows use of OnPush.)
    // Deferred: an `ngModelGroup` registers its control a microtask after this hook, so resolving it here
    // and now would leave a group's errors component with nothing to repaint on.
    const events$ = defer(() => (this.ngModelGroup?.control ?? this.ngModel?.control)?.events ?? of(null));

    // Async validation leaves the control PENDING, so its errors are only readable once it settles.
    // Synchronous validators have no such gap, so without a form directive the events are already the signal.
    // `startWith` so each settle repaints once: under `updateOn: 'submit'` the touches land while the form
    // is still pending, and would otherwise never be painted.
    const controlEvents$ = this.formDirective
      ? this.formDirective.idle$.pipe(switchMap(() => events$.pipe(startWith(null))))
      : events$;

    // `NgForm.submitted` is untracked, and the form's `revealOn` is a signal this OnPush component does not
    // own, so neither repaints on its own. Both gate the messages, so both have to.
    const repaints: Observable<unknown>[] = [
      controlEvents$,
      this.ngForm?.ngSubmit ?? EMPTY,
      this.formDirective ? toObservable(this.formDirective.revealOn, { injector: this.injector }) : EMPTY
    ];

    merge(...repaints)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.fieldErrorsComponentRef?.instance.markForCheck();
        // The field is a sibling of the errors component, so nothing above marks it. Without this its
        // `aria-invalid` would keep whatever it bound on the first pass.
        this.decorator?.projectedField?.markForCheck?.();
      });
  }
}

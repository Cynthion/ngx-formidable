import {
  AfterViewInit,
  Directive,
  EnvironmentInjector,
  inject,
  Injector,
  OnDestroy,
  Optional,
  ViewContainerRef
} from '@angular/core';
import { NgModel, NgModelGroup } from '@angular/forms';
import { of, Subject, switchMap, takeUntil } from 'rxjs';
import { FieldErrorsComponent } from '../components/field-errors/field-errors.component';
import { FormDirective } from './form.directive';

/**
 * Dynamically instantiates a `<formidable-field-errors>` component next to any form control
 * decorated with this `formidableFieldErrors` directive, and synchronizes its display
 * with the host `NgModel` or `NgModelGroup`.
 *
 * - Automatically picks up `NgModel` or `NgModelGroup` from DI
 * - Subscribes to the parent FormDirective’s `idle$` stream to mark the errors component for check on every model change
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
  private readonly formDirective = inject(FormDirective);
  private readonly destroy$ = new Subject<void>();

  private fieldErrorsComponentRef = this.viewContainerRef.createComponent(FieldErrorsComponent, {
    injector: this.injector,
    environmentInjector: this.environmentInjector
  });

  @Optional() private readonly ngModel = inject(NgModel, { optional: true });
  @Optional() private readonly ngModelGroup = inject(NgModelGroup, {
    optional: true,
    self: true
  });

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    this.fieldErrorsComponentRef.destroy();
  }

  public ngAfterViewInit(): void {
    this.fieldErrorsComponentRef.instance.ngModel = this.ngModel ?? undefined;
    this.fieldErrorsComponentRef.instance.ngModelGroup = this.ngModelGroup ?? undefined;

    // When the form is idle, listen to all events of the ngModel or ngModelgroup
    // and mark the component and its ancestors as dirty. (Allows use of OnPush.)
    const control = this.ngModelGroup?.control ?? this.ngModel?.control;

    this.formDirective.idle$
      .pipe(
        switchMap(() => control?.events ?? of(null)),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.fieldErrorsComponentRef.instance.markForCheck();
      });
  }
}

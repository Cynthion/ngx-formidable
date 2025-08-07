import { AfterViewInit, Directive, inject, Injector, OnDestroy, Optional, ViewContainerRef } from '@angular/core';
import { NgModel, NgModelGroup } from '@angular/forms';
import { of, Subject, switchMap, takeUntil } from 'rxjs';
import { FieldErrorsComponent } from '../components/field-errors/field-errors.component';
import { FormDirective } from './form.directive';

/**
 * Directive to display form field errors.
 *
 * This directive creates an instance of `FieldErrorsComponent` and manages its lifecycle.
 * It listens to changes in the form control and updates the component accordingly.
 */
@Directive({ selector: '[formidableFieldErrors]' })
export class FieldErrorsDirective implements AfterViewInit, OnDestroy {
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly injector = inject(Injector);
  private readonly formDirective = inject(FormDirective);
  private readonly destroy$ = new Subject<void>();

  private fieldErrorsComponentRef = this.viewContainerRef.createComponent(FieldErrorsComponent, {
    injector: this.injector
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

    // 1) Did the user add *any* Angular sync validators?
    const hasSync = control?.validator != null;

    // 2) Did the form get wired up with a Vest suite?
    //    `suite` is the `staticSuite` you passed into <form [suite]="suite">.
    const hasAsyncSuite = !!this.formDirective.suite;

    if (hasSync && hasAsyncSuite) {
      console.error(
        `[ngx-vest-forms] Field "${this.ngModel?.name}" is using both Angular sync validators ` +
          `(required / minLength / maxLength) AND a Vest async suite on the form. ` +
          `Angular will skip async validators if any sync validator fails, so your Vest messages ` +
          `will never show. Either remove the sync validators or remove the Vest suite on this form.`
      );
    }
  }
}

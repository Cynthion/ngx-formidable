import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNgxMask } from 'ngx-mask';
import { FieldLabelDirective } from '../../directives/field-label.directive';
import { DropdownFieldComponent } from '../fields/dropdown-field/dropdown-field.component';
import { InputFieldComponent } from '../fields/input-field/input-field.component';
import { FieldDecoratorComponent } from './field-decorator.component';

/**
 * The decorator is `OnPush`, which it could not be until its queries and the field's state became signals.
 *
 * Everything it renders is read off the projected field — `readonly`, `disabled`, `placeholder`, the label —
 * and none of it is the decorator's own input, so nothing tells it they moved. Under `Eager` it was checked
 * every cycle and never had to be told. Under `OnPush` the signal read inside each getter is what marks this
 * view, and there is nothing else: make `canLabelRest` a plain getter over plain fields again and every
 * assertion below fails with the decorator stuck on its first render.
 *
 * Asserted against the decorator's own **template**, never its host classes: host bindings are evaluated in
 * the parent's view, which `detectChanges()` on the fixture re-runs whatever the strategy — so a host class
 * would pass with or without the signals and would prove nothing. The hosts are `Eager` for the same
 * reason the other decorator specs are: that is what applies the changed binding to the field at all, and
 * it does nothing for the `OnPush` decorator's own template, which is what is under test here.
 *
 * `label-position.spec.ts` covers where a label lands. This covers only that it follows at all.
 */

@Component({
  imports: [FieldDecoratorComponent, InputFieldComponent, FieldLabelDirective],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <formidable-field-decorator>
      <label
        formidableFieldLabel
        position="inside"
        >Name</label
      >
      <formidable-input-field
        name="field"
        [placeholder]="placeholder"
        [readonly]="readonly"
        [disabled]="disabled" />
    </formidable-field-decorator>
  `
})
class LabelStateHostComponent {
  placeholder = '';
  readonly = false;
  disabled = false;
}

@Component({
  imports: [FieldDecoratorComponent, DropdownFieldComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <formidable-field-decorator>
      <formidable-dropdown-field
        name="field"
        [options]="[{ value: 'a' }, { value: 'b' }]" />
    </formidable-field-decorator>
  `
})
class PanelHostComponent {}

describe('decorator OnPush contract', () => {
  let fixture: ComponentFixture<LabelStateHostComponent>;

  /** The class the decorator's template writes out of `labelState`. */
  function labelState(): string {
    const wrapper = fixture.nativeElement.querySelector('.label-wrapper') as HTMLElement;

    return Array.from(wrapper.classList).find((name) => name.startsWith('label-') && name !== 'label-wrapper')!;
  }

  function mount(): void {
    fixture = TestBed.createComponent(LabelStateHostComponent);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LabelStateHostComponent, PanelHostComponent],
      providers: [provideNgxMask()]
    }).compileComponents();
  });

  afterEach(() => fixture?.destroy());

  it('follows the field out of resting when it is made readonly', () => {
    mount();

    expect(labelState()).toBe('label-resting');

    fixture.componentInstance.readonly = true;
    fixture.detectChanges();

    expect(labelState()).toBe('label-floating');
  });

  it('follows the field out of resting when it is disabled', () => {
    mount();

    fixture.componentInstance.disabled = true;
    fixture.detectChanges();

    expect(labelState()).toBe('label-floating');
  });

  // The case the old rationale named first: a `placeholder` leaves an `inside` label nothing to rest in.
  it('follows a placeholder added at runtime', () => {
    mount();

    fixture.componentInstance.placeholder = 'Your name';
    fixture.detectChanges();

    expect(labelState()).toBe('label-floating');
  });

  /**
   * The field's own half of the same claim. `togglePanel` used to end in `markForCheck()`; the panel's
   * `.open` class is written by the field's `OnPush` template, so the signal is now what repaints it.
   */
  it('repaints an OnPush field when its panel opens, with nothing marking it', () => {
    const panelFixture = TestBed.createComponent(PanelHostComponent);
    const panel = () => panelFixture.nativeElement.querySelector('.panel') as HTMLElement;

    panelFixture.detectChanges();

    const field = panelFixture.debugElement.query(By.directive(DropdownFieldComponent))
      .componentInstance as DropdownFieldComponent;

    expect(panel().classList.contains('open')).toBe(false);

    field.togglePanel(true);
    panelFixture.detectChanges();
    expect(panel().classList.contains('open')).toBe(true);

    field.togglePanel(false);
    panelFixture.detectChanges();
    expect(panel().classList.contains('open')).toBe(false);

    panelFixture.destroy();
  });

  /**
   * The label's transition is gated by a class released one `requestAnimationFrame` after the first render,
   * with nothing around it to repaint — written when the decorator was checked every cycle. As a signal the
   * flag marks the view itself.
   */
  it('releases the label animation gate from a bare requestAnimationFrame', fakeAsync(() => {
    mount();

    const label = () => fixture.nativeElement.querySelector('.label-wrapper') as HTMLElement;

    expect(label().classList.contains('label-animated')).toBe(false);

    tick(100); // the frame the decorator waits for, plus the field's own mask timers
    fixture.detectChanges();

    expect(label().classList.contains('label-animated')).toBe(true);

    flush();
  }));
});

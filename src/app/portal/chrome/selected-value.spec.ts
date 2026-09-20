import { ChangeDetectionStrategy, Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectedValueDirective } from './selected-value.directive';

/**
 * Contract of `portalSelectedValue`, which exists because `[value]` on a `<select>` cannot state the
 * selection when the options are a control-flow block.
 *
 * Zoneless, because that is how the portal runs and because the directive's whole job is a write timed
 * against the render — a spec that proved it under zone change detection would be proving the harness. The
 * NG0914 warning the provider logs is expected, exactly as in the library's own `zoneless.spec.ts`.
 */
@Component({
  imports: [SelectedValueDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <select
      id="dynamic"
      [portalSelectedValue]="value()">
      @if (value() === '') {
        <option
          value=""
          disabled>
          Mixed
        </option>
      }
      @for (option of options; track option) {
        <option [value]="option">{{ option }}</option>
      }
    </select>

    <!-- The same list, bound the way every one of these selects used to be. -->
    <select
      id="plain"
      [value]="value()">
      @for (option of options; track option) {
        <option [value]="option">{{ option }}</option>
      }
    </select>
  `
})
class HostComponent {
  readonly options = ['outside', 'inside', 'border'];
  readonly value = signal('inside');
}

describe('portalSelectedValue', () => {
  let fixture: ComponentFixture<HostComponent>;

  function select(id: string): HTMLSelectElement {
    return (fixture.nativeElement as HTMLElement).querySelector(`#${id}`) as HTMLSelectElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('states the value it is given rather than the first option', () => {
    expect(select('dynamic').value).toBe('inside');
  });

  // Not a claim about Angular so much as the reason this directive exists: the plain binding is applied
  // while the `@for` has produced no options yet, and a `<select>` given a value it cannot match falls
  // back to its first. Two controls, one list, two different answers.
  it('is what `[value]` on the select cannot do', () => {
    expect(select('plain').value).toBe('outside');
    expect(select('plain').value).not.toBe(fixture.componentInstance.value());
  });

  it('follows the value', () => {
    fixture.componentInstance.value.set('border');
    fixture.detectChanges();

    expect(select('dynamic').value).toBe('border');
  });

  // An empty value is how a form-scope control says the fields disagree. It has to land on the disabled
  // option the block adds for it, not on the first real choice.
  it('selects the mixed option for an empty value', () => {
    fixture.componentInstance.value.set('');
    fixture.detectChanges();

    expect(select('dynamic').value).toBe('');
    expect(select('dynamic').selectedOptions[0]?.textContent?.trim()).toBe('Mixed');
  });
});

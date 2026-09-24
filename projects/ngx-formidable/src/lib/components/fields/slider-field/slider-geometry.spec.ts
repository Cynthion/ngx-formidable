import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SliderFieldComponent } from './slider-field.component';

/**
 * Contract of the slider's label row: the labels along the track are placed absolutely, so the row itself
 * is what has to carry their height. A row that measures zero leaves them hanging out of the field's box
 * and over whatever the consumer puts below it — and only their own line height says how tall they are.
 */
@Component({
  imports: [SliderFieldComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <formidable-slider-field
      [min]="0"
      [max]="10"
      [showMinMaxLabels]="true"
      minLabel="Mild"
      maxLabel="Volcanic" />
  `
})
class SliderHostComponent {}

describe('SliderFieldComponent geometry', () => {
  let fixture: ComponentFixture<SliderHostComponent>;
  let root: HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(SliderHostComponent);
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
  });

  it('gives the label row the height of its labels, so they stay inside the field', () => {
    const field = root.querySelector('.field') as HTMLElement;
    const row = root.querySelector('.slider-label-row') as HTMLElement;
    const labels = Array.from(root.querySelectorAll<HTMLElement>('.slider-label-item'));

    expect(labels.length).toBe(2);
    expect(row.getBoundingClientRect().height).toBeCloseTo(labels[0]!.getBoundingClientRect().height, 0);

    for (const label of labels) {
      expect(label.getBoundingClientRect().bottom).toBeLessThanOrEqual(field.getBoundingClientRect().bottom);
    }
  });
});

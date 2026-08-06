import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgxMaskConfig, provideNgxMask } from 'ngx-mask';
import { FieldLabelDirective } from '../../directives/field-label.directive';
import { FieldPrefixDirective } from '../../directives/field-prefix.directive';
import { FieldTooltipDirective } from '../../directives/field-tooltip.directive';
import { FieldLabelPosition } from '../../models/formidable.model';
import { DateFieldComponent } from '../fields/date-field/date-field.component';
import { InputFieldComponent } from '../fields/input-field/input-field.component';
import { RadioGroupFieldComponent } from '../fields/radio-group-field/radio-group-field.component';
import { SelectFieldComponent } from '../fields/select-field/select-field.component';
import { TextareaFieldComponent } from '../fields/textarea-field/textarea-field.component';
import { TimeFieldComponent } from '../fields/time-field/time-field.component';
import { FieldDecoratorComponent } from './field-decorator.component';

/**
 * Contract of `formidableFieldLabel [position]`.
 *
 * An `outside` label sits in `.before-wrapper` in normal flow; every other position renders the label over
 * the field, which puts it in the field's own container and offsets it from that container's top edge. The
 * geometry blocks below measure against the field's own inner top (or border), and derive the value's
 * line-box from the input's content box the way the browser centers it — never from the same tokens the
 * CSS uses.
 *
 * The rules being pinned down: with the label `inside`, the floating label and the value are centered as
 * one block (equal slack above and below), while an empty field's resting label is centered on its own.
 * With the label on the `border` it straddles the top border and the value stays centered, as `outside`;
 * `border-prefix` is the same but aligned with a projected prefix instead of with the value.
 */

/** px per rem, so the expectations stay written in the tokens' own unit. */
function rem(value: number): number {
  return value * parseFloat(getComputedStyle(document.documentElement).fontSize);
}

@Component({
  standalone: true,
  imports: [FieldDecoratorComponent, InputFieldComponent, FieldLabelDirective],
  template: `
    <formidable-field-decorator>
      <formidable-input-field
        name="field"
        [placeholder]="placeholder"
        [mask]="mask"
        [maskConfig]="maskConfig"
        [readonly]="readonly"
        [disabled]="disabled" />
      <div
        formidableFieldLabel
        [position]="position">
        Label
      </div>
    </formidable-field-decorator>
  `
})
class InputHostComponent {
  position: FieldLabelPosition = 'inside';
  placeholder = '';
  mask?: string;
  maskConfig?: Partial<NgxMaskConfig>;
  readonly = false;
  disabled = false;
}

/** Same field, but with a prefix wide enough to push the value inwards. */
@Component({
  standalone: true,
  imports: [FieldDecoratorComponent, InputFieldComponent, FieldLabelDirective, FieldPrefixDirective],
  template: `
    <formidable-field-decorator>
      <formidable-input-field name="field" />
      <div
        formidableFieldLabel
        [position]="position">
        Label
      </div>
      <div
        formidableFieldPrefix
        style="width: 4rem">
        Prefix
      </div>
    </formidable-field-decorator>
  `
})
class PrefixHostComponent {
  position: FieldLabelPosition = 'inside';
}

/** Same field, but with a tooltip taller than the label sharing the label's wrapper. */
@Component({
  standalone: true,
  imports: [FieldDecoratorComponent, InputFieldComponent, FieldLabelDirective, FieldTooltipDirective],
  template: `
    <formidable-field-decorator>
      <formidable-input-field name="field" />
      <div
        formidableFieldLabel
        position="inside">
        Label
      </div>
      <div
        formidableFieldTooltip
        style="height: 5rem">
        ?
      </div>
    </formidable-field-decorator>
  `
})
class TooltipHostComponent {}

/** A textarea top-aligns its value, so it clears an inside label with an offset rather than the padding. */
@Component({
  standalone: true,
  imports: [FieldDecoratorComponent, TextareaFieldComponent, FieldLabelDirective],
  template: `
    <formidable-field-decorator>
      <formidable-textarea-field name="field" />
      <div
        formidableFieldLabel
        [position]="position">
        Label
      </div>
    </formidable-field-decorator>
  `
})
class TextareaHostComponent {
  position: FieldLabelPosition = 'inside';
}

@Component({
  standalone: true,
  imports: [FieldDecoratorComponent, RadioGroupFieldComponent, FieldLabelDirective],
  template: `
    <formidable-field-decorator>
      <formidable-radio-group-field name="field" />
      <div
        formidableFieldLabel
        position="inside">
        Label
      </div>
    </formidable-field-decorator>
  `
})
class RadioGroupHostComponent {}

describe('formidableFieldLabel [position]', () => {
  let fixture: ComponentFixture<InputHostComponent>;
  let host: InputHostComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideNgxMask()] });

    fixture = TestBed.createComponent(InputHostComponent);
    host = fixture.componentInstance;

    // The label animates its `top`, so a rect read straight after a state change would return the
    // start of the transition. These assertions are about where the label lands, not how it gets there.
    fixture.nativeElement.style.setProperty('--formidable-animation-duration', '0s');
  });

  /** `placeholder` and `mask` are declarative: configure the field, then render. */
  function render(): void {
    fixture.detectChanges();
  }

  function input(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input') as HTMLInputElement;
  }

  function labelWrapper(): HTMLElement {
    return fixture.nativeElement.querySelector('.label-wrapper') as HTMLElement;
  }

  function setPosition(position: FieldLabelPosition): void {
    host.position = position;
    fixture.detectChanges();
  }

  function focus(): void {
    input().dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();
  }

  function fill(value: string): void {
    input().value = value;
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  /** The field's inner top: where its content box starts, below the border. */
  function innerTop(): number {
    const field = input();
    return field.getBoundingClientRect().top + parseFloat(getComputedStyle(field).borderTopWidth);
  }

  /** Top of the label's line-box, relative to the field's inner top. */
  function labelTop(): number {
    return labelWrapper().getBoundingClientRect().top - innerTop();
  }

  /**
   * Top of the value's line-box, relative to the field's inner top — derived the way the browser
   * places it: the line-box is centered in the input's content box.
   */
  function valueTop(): number {
    const field = input();
    const style = getComputedStyle(field);
    const paddingTop = parseFloat(style.paddingTop);
    const contentHeight = field.clientHeight - paddingTop - parseFloat(style.paddingBottom);

    return paddingTop + (contentHeight - parseFloat(style.lineHeight)) / 2;
  }

  describe('outside', () => {
    beforeEach(() => setPosition('outside'));

    it('leaves the label in normal flow and the value untouched', () => {
      expect(labelWrapper().classList.contains('label-outside')).toBe(true);
      expect(getComputedStyle(labelWrapper()).position).toBe('static');
      expect(getComputedStyle(input()).paddingTop).toBe('0px');
    });

    it('centers the value in the field’s inner height', () => {
      expect(valueTop()).toBeCloseTo(rem(1.0125), 1);
    });

    it('never moves, whatever the field does', () => {
      const before = labelWrapper().getBoundingClientRect().top;

      focus();
      fill('anything');

      expect(labelWrapper().getBoundingClientRect().top).toBe(before);
      expect(labelWrapper().classList.contains('label-outside')).toBe(true);
    });
  });

  describe('inside — geometry', () => {
    it('pushes the value down by exactly the floating label’s line-box', () => {
      setPosition('inside');

      expect(parseFloat(getComputedStyle(input()).paddingTop)).toBeCloseTo(rem(1.2), 1);
    });

    it('centers the floating label and the value as one block', () => {
      setPosition('inside');
      focus();

      // equal slack above the label and below the value
      const slackAbove = labelTop();
      const innerHeight = input().clientHeight;
      const slackBelow = innerHeight - (valueTop() + parseFloat(getComputedStyle(input()).lineHeight));

      expect(slackAbove).toBeCloseTo(rem(0.4125), 1);
      expect(slackBelow).toBeCloseTo(slackAbove, 1);
    });

    it('floats clear of the value instead of overlapping it', () => {
      setPosition('inside');
      focus();

      const labelBottom = labelTop() + labelWrapper().getBoundingClientRect().height;

      expect(labelWrapper().getBoundingClientRect().height).toBeCloseTo(rem(1.2), 1);
      expect(labelBottom).toBeLessThanOrEqual(valueTop() + 0.5);
    });

    it('rests centered in the field’s inner height, at the value’s own size', () => {
      setPosition('inside');

      const innerHeight = input().clientHeight;
      const height = labelWrapper().getBoundingClientRect().height;

      expect(height).toBeCloseTo(rem(1.6), 1);
      expect(labelTop()).toBeCloseTo(rem(1.0125), 1);
      // equal space above and below it
      expect(innerHeight - (labelTop() + height)).toBeCloseTo(labelTop(), 1);
    });

    it('rests exactly where the value sits with the label outside', () => {
      setPosition('outside');
      const centeredValueTop = valueTop();

      setPosition('inside');

      expect(labelTop()).toBeCloseTo(centeredValueTop, 1);
    });

    it('rises from centered to the top of the label+value block', () => {
      setPosition('inside');
      const resting = labelTop();

      focus();

      // 1.0125 centered → 0.4125 floating
      expect(resting - labelTop()).toBeCloseTo(rem(0.6), 1);
    });

    it('stays on one line and ellipsizes', () => {
      setPosition('inside');

      const projected = labelWrapper().firstElementChild as HTMLElement;
      const style = getComputedStyle(projected);

      expect(getComputedStyle(labelWrapper()).whiteSpace).toBe('nowrap');
      expect(style.whiteSpace).toBe('nowrap');
      expect(style.overflow).toBe('hidden');
      expect(style.textOverflow).toBe('ellipsis');
    });

    it('bounds the label to the field’s own horizontal padding', () => {
      setPosition('inside');

      const label = labelWrapper().getBoundingClientRect();
      const field = input().getBoundingClientRect();
      const padding = parseFloat(getComputedStyle(input()).paddingLeft);

      expect(label.left - field.left).toBeCloseTo(padding, 1);
      expect(field.right - label.right).toBeCloseTo(padding, 1);
    });
  });

  describe('inside — when the label may rest', () => {
    it('rests while the field is empty and unfocused', () => {
      render();

      expect(labelWrapper().classList.contains('label-resting')).toBe(true);
    });

    it('floats while focused', () => {
      render();
      focus();

      expect(labelWrapper().classList.contains('label-floating')).toBe(true);
    });

    it('keeps floating once filled and blurred', () => {
      render();
      focus();
      fill('Chris');
      input().dispatchEvent(new FocusEvent('blur'));
      fixture.detectChanges();

      expect(labelWrapper().classList.contains('label-floating')).toBe(true);
    });

    it('floats instead of resting when a placeholder occupies the value area', () => {
      host.placeholder = 'Your name';
      render();

      expect(labelWrapper().classList.contains('label-floating')).toBe(true);
    });

    it('floats instead of resting when mask slots occupy the value area', () => {
      host.mask = '000-000';
      host.maskConfig = { showMaskTyped: true };
      render();

      expect(labelWrapper().classList.contains('label-floating')).toBe(true);
    });

    it('still rests behind a mask that hides its slots while empty', () => {
      host.mask = '000-000';
      render();

      expect(labelWrapper().classList.contains('label-resting')).toBe(true);
    });
  });

  describe('inside-floating', () => {
    beforeEach(() => setPosition('inside-floating'));

    it('never rests, however empty the field is', () => {
      expect(labelWrapper().classList.contains('label-resting')).toBe(false);
      expect(labelWrapper().classList.contains('label-floating')).toBe(true);
      expect(labelTop()).toBeCloseTo(rem(0.4125), 1);
    });

    it('stays put when the field is focused and filled', () => {
      const top = labelTop();

      focus();
      fill('Chris');

      expect(labelTop()).toBeCloseTo(top, 1);
    });
  });

  describe('border', () => {
    beforeEach(() => setPosition('border'));

    it('straddles the field’s top border', () => {
      const field = input().getBoundingClientRect();
      const label = labelWrapper().getBoundingClientRect();
      const border = parseFloat(getComputedStyle(input()).borderTopWidth);

      expect(labelWrapper().classList.contains('label-border')).toBe(true);
      expect(label.top + label.height / 2).toBeCloseTo(field.top + border / 2, 1);
    });

    it('leaves the value centered, exactly as with the label outside', () => {
      const onBorder = valueTop();

      setPosition('outside');

      expect(getComputedStyle(input()).paddingTop).toBe('0px');
      expect(onBorder).toBeCloseTo(valueTop(), 1);
      expect(onBorder).toBeCloseTo(rem(1.0125), 1);
    });

    it('starts its text where the value starts', () => {
      const label = labelWrapper();
      const textLeft = label.getBoundingClientRect().left + parseFloat(getComputedStyle(label).paddingLeft);

      expect(textLeft - input().getBoundingClientRect().left).toBeCloseTo(
        parseFloat(getComputedStyle(input()).paddingLeft),
        1
      );
    });

    it('shrink-wraps, so its band hides only the border it covers', () => {
      const label = labelWrapper().getBoundingClientRect();
      const field = input().getBoundingClientRect();
      const gap = parseFloat(getComputedStyle(labelWrapper()).paddingLeft);

      // hugs the text plus a gap either side, rather than striping the whole border
      expect(gap).toBeGreaterThan(0);
      expect(label.width).toBeLessThan(field.width / 2);

      // and the value-aligned states really do span the field, so this is a genuine difference
      setPosition('inside-floating');
      expect(labelWrapper().getBoundingClientRect().width).toBeGreaterThan(field.width / 2);
    });

    it('paints a band to hide the border behind it', () => {
      expect(getComputedStyle(labelWrapper()).backgroundImage).toContain('linear-gradient');
    });

    // `readonly`/`disabled` remap the fill on the field element, which the label — a sibling — cannot see,
    // so the band follows a variable of its own that the decorator's host remaps instead.
    it('repaints its band when the field remaps its fill', () => {
      const fill = getComputedStyle(labelWrapper()).backgroundImage;

      host.readonly = true;
      fixture.detectChanges();

      const readonlyFill = getComputedStyle(labelWrapper()).backgroundImage;

      expect(readonlyFill).toContain('linear-gradient');
      expect(readonlyFill).not.toBe(fill);
    });

    it('never rests, however empty the field is', () => {
      expect(labelWrapper().classList.contains('label-resting')).toBe(false);

      focus();
      fill('Chris');

      expect(labelWrapper().classList.contains('label-border')).toBe(true);
    });
  });

  describe('border-prefix', () => {
    beforeEach(() => setPosition('border-prefix'));

    it('straddles the top border, exactly as border does', () => {
      const onPrefix = labelTop();

      setPosition('border');

      expect(onPrefix).toBeCloseTo(labelTop(), 1);
    });

    it('leaves the value centered, exactly as border does', () => {
      expect(getComputedStyle(input()).paddingTop).toBe('0px');
      expect(valueTop()).toBeCloseTo(rem(1.0125), 1);
    });

    it('never rests, however empty the field is', () => {
      expect(labelWrapper().classList.contains('label-border-prefix')).toBe(true);

      focus();
      fill('Chris');

      expect(labelWrapper().classList.contains('label-border-prefix')).toBe(true);
    });
  });

  /** Where the label's own text starts, discounting the gap its band reaches out by. */
  function labelTextLeft(root: HTMLElement): number {
    const label = root.querySelector('.label-wrapper') as HTMLElement;

    return label.getBoundingClientRect().left + parseFloat(getComputedStyle(label).paddingLeft);
  }

  /** Renders a prefixed field and waits out the `requestAnimationFrame` `adjustLayout` measures in. */
  async function renderWithPrefix(position: FieldLabelPosition): Promise<HTMLElement> {
    const prefixFixture = TestBed.createComponent(PrefixHostComponent);
    prefixFixture.componentInstance.position = position;
    prefixFixture.detectChanges();

    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    prefixFixture.detectChanges();

    return prefixFixture.nativeElement as HTMLElement;
  }

  it('follows the value inwards when a prefix pushes it', async () => {
    const root = await renderWithPrefix('inside');
    const field = root.querySelector('input') as HTMLInputElement;
    const label = root.querySelector('.label-wrapper') as HTMLElement;
    const padding = parseFloat(getComputedStyle(field).paddingLeft);

    expect(padding).toBeGreaterThan(rem(4));
    expect(label.getBoundingClientRect().left - field.getBoundingClientRect().left).toBeCloseTo(padding, 1);
  });

  it('follows the value inwards for a border label too', async () => {
    const root = await renderWithPrefix('border');
    const field = root.querySelector('input') as HTMLInputElement;
    const padding = parseFloat(getComputedStyle(field).paddingLeft);

    expect(padding).toBeGreaterThan(rem(4));
    expect(labelTextLeft(root) - field.getBoundingClientRect().left).toBeCloseTo(padding, 1);
  });

  it('aligns with the prefix, not the value, when the position says so', async () => {
    const root = await renderWithPrefix('border-prefix');
    const field = root.querySelector('input') as HTMLInputElement;
    const prefix = root.querySelector('[formidableFieldPrefix]') as HTMLElement;
    const fieldLeft = field.getBoundingClientRect().left;

    // the prefix really is pushing the value in, so value- and prefix-alignment are far apart
    expect(parseFloat(getComputedStyle(field).paddingLeft)).toBeGreaterThan(rem(4));

    // the label's text starts at the field's own padding — which is where the prefix's text starts
    expect(labelTextLeft(root) - fieldLeft).toBeCloseTo(rem(1), 1);
    expect(labelTextLeft(root)).toBeCloseTo(prefix.getBoundingClientRect().left, 1);
  });

  describe('where the label element lives', () => {
    function beforeWrapper(): HTMLElement {
      return fixture.nativeElement.querySelector('.before-wrapper') as HTMLElement;
    }

    function container(): HTMLElement {
      return fixture.nativeElement.querySelector('.container-horizontal') as HTMLElement;
    }

    it('keeps an outside label in the wrapper above the field', () => {
      setPosition('outside');

      expect(beforeWrapper().contains(labelWrapper())).toBe(true);
      expect(container().contains(labelWrapper())).toBe(false);
    });

    // This is what lets the offsets be plain distances instead of reaching down past the wrapper.
    it('moves a label rendered over the field into the field own container', () => {
      for (const position of ['inside', 'inside-floating', 'border', 'border-prefix'] as FieldLabelPosition[]) {
        setPosition(position);

        expect(container().contains(labelWrapper())).toBe(true);
        expect(beforeWrapper().contains(labelWrapper())).toBe(false);
      }
    });

    it('collapses the wrapper once the label has left it', () => {
      setPosition('outside');
      expect(getComputedStyle(beforeWrapper()).display).not.toBe('none');

      setPosition('inside');
      expect(getComputedStyle(beforeWrapper()).display).toBe('none');
    });

    it('keeps the wrapper for a projected tooltip, even with the label over the field', () => {
      const tooltipFixture = TestBed.createComponent(TooltipHostComponent);
      tooltipFixture.detectChanges();

      const before = tooltipFixture.nativeElement.querySelector('.before-wrapper') as HTMLElement;

      expect(getComputedStyle(before).display).not.toBe('none');
    });
  });

  it('keeps its offset when a taller tooltip stretches the wrapper it lives in', () => {
    const tooltipFixture = TestBed.createComponent(TooltipHostComponent);
    tooltipFixture.detectChanges();

    const root = tooltipFixture.nativeElement as HTMLElement;
    const field = root.querySelector('input') as HTMLInputElement;
    const label = root.querySelector('.label-wrapper') as HTMLElement;
    const before = root.querySelector('.before-wrapper') as HTMLElement;
    const innerTop = field.getBoundingClientRect().top + parseFloat(getComputedStyle(field).borderTopWidth);

    // the wrapper is genuinely taller than a label line, which is what used to skew the offset
    expect(before.getBoundingClientRect().height).toBeGreaterThan(rem(1.6));
    expect(label.getBoundingClientRect().top - innerTop).toBeCloseTo(rem(1.0125), 1);
  });

  // A textarea top-aligns its value, so `--formidable-field-value-top` clears the label instead of the
  // padding the centered fields use. It is the one field where the two differ.
  it('clears an inside label on a textarea, whose value is top-aligned', () => {
    const textareaFixture = TestBed.createComponent(TextareaHostComponent);
    textareaFixture.detectChanges();

    const textarea = textareaFixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;

    // the value starts where the label+value block puts it, not at the textarea's own padding
    expect(parseFloat(getComputedStyle(textarea).paddingTop)).toBeCloseTo(rem(1.6125), 1);

    textareaFixture.componentInstance.position = 'outside';
    textareaFixture.detectChanges();

    expect(parseFloat(getComputedStyle(textarea).paddingTop)).toBeCloseTo(rem(1), 1);
  });

  // The decorator resolves the label state from the field's `readonly`/`disabled`, which it cannot observe
  // — so this only holds because it is not OnPush.
  it('floats instead of resting once the field is made readonly', () => {
    setPosition('inside');
    expect(labelWrapper().classList.contains('label-resting')).toBe(true);

    host.readonly = true;
    fixture.detectChanges();

    expect(labelWrapper().classList.contains('label-floating')).toBe(true);
  });

  // The layout gate runs before the position is resolved, so it covers `border` the same way.
  it('falls back to outside for a field with no room for a label over it', () => {
    const radioFixture = TestBed.createComponent(RadioGroupHostComponent);
    radioFixture.detectChanges();

    const wrapper = radioFixture.nativeElement.querySelector('.label-wrapper') as HTMLElement;

    expect(wrapper.classList.contains('label-outside')).toBe(true);
    expect(getComputedStyle(wrapper).position).toBe('static');
  });
});

describe('IFormidableField.canLabelRest', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideNgxMask()] }));

  it('is false for a date field, which always shows its mask slots', () => {
    const fixture = TestBed.createComponent(DateFieldComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.canLabelRest).toBe(false);
  });

  it('is false for a time field, which always shows its mask slots', () => {
    const fixture = TestBed.createComponent(TimeFieldComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.canLabelRest).toBe(false);
  });

  it('is false for a select field, which always shows an option', () => {
    const fixture = TestBed.createComponent(SelectFieldComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.canLabelRest).toBe(false);
  });

  it('is false while readonly or disabled', () => {
    const fixture = TestBed.createComponent(InputFieldComponent);
    fixture.detectChanges();

    fixture.componentRef.setInput('readonly', true);
    expect(fixture.componentInstance.canLabelRest).toBe(false);

    fixture.componentRef.setInput('readonly', false);
    fixture.componentRef.setInput('disabled', true);
    expect(fixture.componentInstance.canLabelRest).toBe(false);
  });
});

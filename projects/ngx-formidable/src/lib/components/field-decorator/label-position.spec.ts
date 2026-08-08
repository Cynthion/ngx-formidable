import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgxMaskConfig, provideNgxMask } from 'ngx-mask';
import { FieldLabelDirective } from '../../directives/field-label.directive';
import { FieldPrefixDirective } from '../../directives/field-prefix.directive';
import { FieldLabelAdornmentDirective } from '../../directives/field-label-adornment.directive';
import { FieldLabelPosition } from '../../models/formidable.model';
import { AutocompleteFieldComponent } from '../fields/autocomplete-field/autocomplete-field.component';
import { DateFieldComponent } from '../fields/date-field/date-field.component';
import { DropdownFieldComponent } from '../fields/dropdown-field/dropdown-field.component';
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

/**
 * Where the value's text starts, in viewport coordinates: the field's padding is measured from its content
 * box, so the border is between it and the border-box edge every label is positioned from.
 */
function valueLeft(field: HTMLElement): number {
  const style = getComputedStyle(field);

  return field.getBoundingClientRect().left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
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

/** Same field, but with an adornment sharing the label's row. */
@Component({
  standalone: true,
  imports: [FieldDecoratorComponent, InputFieldComponent, FieldLabelDirective, FieldLabelAdornmentDirective],
  template: `
    <formidable-field-decorator>
      <formidable-input-field name="field" />
      <div
        formidableFieldLabel
        [position]="position">
        Label
      </div>
      <div formidableFieldLabelAdornment>?</div>
    </formidable-field-decorator>
  `
})
class LabelAdornmentHostComponent {
  position: FieldLabelPosition = 'inside';
}

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

/**
 * The panel fields render their value in an inner `.wrapped-input` instead of on the field element, so the
 * field's own padding stops at the wrapper and cannot place the value. The label is `inside-floating` so
 * every one of them floats, whatever it shows while empty.
 */
@Component({
  standalone: true,
  imports: [
    FieldDecoratorComponent,
    DateFieldComponent,
    TimeFieldComponent,
    AutocompleteFieldComponent,
    DropdownFieldComponent,
    FieldLabelDirective
  ],
  template: `
    <formidable-field-decorator>
      <formidable-date-field name="date" />
      <div
        formidableFieldLabel
        position="inside-floating">
        Label
      </div>
    </formidable-field-decorator>
    <formidable-field-decorator>
      <formidable-time-field name="time" />
      <div
        formidableFieldLabel
        position="inside-floating">
        Label
      </div>
    </formidable-field-decorator>
    <formidable-field-decorator>
      <formidable-autocomplete-field name="autocomplete" />
      <div
        formidableFieldLabel
        position="inside-floating">
        Label
      </div>
    </formidable-field-decorator>
    <formidable-field-decorator>
      <formidable-dropdown-field name="dropdown" />
      <div
        formidableFieldLabel
        position="inside-floating">
        Label
      </div>
    </formidable-field-decorator>
  `
})
class WrappedInputHostComponent {}

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

  /** How far the `border` label's band reaches above its own centre, in px, resolved on the label. */
  function bandReach(): number {
    const probe = document.createElement('div');

    probe.style.position = 'absolute';
    probe.style.width = 'var(--formidable-label-border-band-reach)';
    labelWrapper().appendChild(probe);

    const width = probe.getBoundingClientRect().width;
    probe.remove();

    return width;
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

    it('bounds the label to the value’s own horizontal band', () => {
      setPosition('inside');

      const label = labelWrapper().getBoundingClientRect();
      const style = getComputedStyle(input());
      const field = input().getBoundingClientRect();
      const inset = parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);

      expect(label.left).toBeCloseTo(valueLeft(input()), 1);
      expect(label.left - field.left).toBeCloseTo(inset, 1);
      expect(field.right - label.right).toBeCloseTo(inset, 1);
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

  // The one position that does not yield the value area to the placeholder: the label takes its place
  // and the field's own placeholder stays hidden behind it until focus floats the label off it.
  describe('inside-placeholder', () => {
    beforeEach(() => {
      host.placeholder = 'Your name';
      setPosition('inside-placeholder');
    });

    it('rests in place of the placeholder, and hides it', () => {
      expect(labelWrapper().classList.contains('label-resting')).toBe(true);
      expect(getComputedStyle(input(), '::placeholder').color).toBe('rgba(0, 0, 0, 0)');
    });

    it('reveals the placeholder once focus floats the label', () => {
      focus();

      expect(labelWrapper().classList.contains('label-floating')).toBe(true);
      expect(getComputedStyle(input(), '::placeholder').color).not.toBe('rgba(0, 0, 0, 0)');
    });

    // Only the placeholder is the label's to take over. Mask slots are the field's own rendering, so
    // `canLabelRest` still vetoes here exactly as it does for `inside`.
    it('still floats when mask slots occupy the value area', () => {
      host.mask = '000-000';
      host.maskConfig = { showMaskTyped: true };
      render();

      expect(labelWrapper().classList.contains('label-floating')).toBe(true);
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

      expect(textLeft).toBeCloseTo(valueLeft(input()), 1);
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

    // The focus ring is a box-shadow spread *outside* the field's border box, so while focused there is
    // more to hide above the border than below it. Without the extra reach the band stops at its bleed
    // and the ring shows above the label on every theme whose border is thicker than that bleed.
    it('reaches up over the focus ring while focused', () => {
      const resting = getComputedStyle(labelWrapper()).backgroundImage;

      expect(bandReach()).toBe(0);

      focus();

      // The ring is sized off the border's thickness, and so is the reach that has to cover it.
      expect(bandReach()).toBeCloseTo(parseFloat(getComputedStyle(input()).borderTopWidth), 2);
      expect(getComputedStyle(labelWrapper()).backgroundImage).not.toBe(resting);
    });

    it('reaches further over a thicker ring', () => {
      fixture.nativeElement.style.setProperty('--formidable-field-border-thickness', '3px');
      focus();

      expect(bandReach()).toBeCloseTo(3, 2);
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

  /** Renders a prefixed field and waits out the `ResizeObserver` the decorator measures the prefix in. */
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

    expect(parseFloat(getComputedStyle(field).paddingLeft)).toBeGreaterThan(rem(4));
    expect(label.getBoundingClientRect().left).toBeCloseTo(valueLeft(field), 1);
  });

  it('follows the value inwards for a border label too', async () => {
    const root = await renderWithPrefix('border');
    const field = root.querySelector('input') as HTMLInputElement;

    expect(parseFloat(getComputedStyle(field).paddingLeft)).toBeGreaterThan(rem(4));
    expect(labelTextLeft(root)).toBeCloseTo(valueLeft(field), 1);
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
      for (const position of [
        'inside',
        'inside-placeholder',
        'inside-floating',
        'border',
        'border-prefix'
      ] as FieldLabelPosition[]) {
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

    // An adornment decorates the label, so on its own it would be stranded above a field it no longer
    // belongs to — and its height would stretch the wrapper the overlay label measures its offset from.
    it('takes a projected adornment with the label when the label moves over the field', () => {
      const adornmentFixture = TestBed.createComponent(LabelAdornmentHostComponent);
      const before = () => adornmentFixture.nativeElement.querySelector('.before-wrapper') as HTMLElement;

      adornmentFixture.componentInstance.position = 'outside';
      adornmentFixture.detectChanges();
      expect(getComputedStyle(before()).display).not.toBe('none');

      for (const position of [
        'inside',
        'inside-placeholder',
        'inside-floating',
        'border',
        'border-prefix'
      ] as FieldLabelPosition[]) {
        adornmentFixture.componentInstance.position = position;
        adornmentFixture.detectChanges();

        expect(getComputedStyle(before()).display).toBe('none');
      }
    });
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

/**
 * A panel field's value lives in an inner `.wrapped-input`, which the field's own padding cannot reach — so
 * whatever the user agent puts on that input (Chrome: `padding: 1px 2px`) is left holding the value, and
 * offsets it from the inset the label is anchored to. Only the label's clearance may remain on it.
 */
describe('a value rendered in a wrapped input', () => {
  let fixture: ComponentFixture<WrappedInputHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideNgxMask()] });

    fixture = TestBed.createComponent(WrappedInputHostComponent);
    fixture.detectChanges();
  });

  function decorator(selector: string): HTMLElement {
    return (fixture.nativeElement.querySelector(selector) as HTMLElement).closest(
      'formidable-field-decorator'
    ) as HTMLElement;
  }

  for (const selector of [
    'formidable-date-field',
    'formidable-time-field',
    'formidable-autocomplete-field',
    'formidable-dropdown-field'
  ]) {
    describe(selector, () => {
      let fieldBox: HTMLElement;
      let input: HTMLInputElement;
      let label: HTMLElement;

      beforeEach(() => {
        const root = decorator(selector);

        fieldBox = root.querySelector('.field') as HTMLElement;
        input = root.querySelector('.wrapped-input') as HTMLInputElement;
        label = root.querySelector('.label-wrapper') as HTMLElement;
      });

      it('carries no padding of its own beyond the label’s clearance', () => {
        const style = getComputedStyle(input);

        expect(style.paddingLeft).toBe('0px');
        expect(style.paddingRight).toBe('0px');
        expect(style.paddingBottom).toBe('0px');
        expect(parseFloat(style.paddingTop)).toBeCloseTo(rem(1.2), 1);
      });

      it('starts its value exactly where the label starts', () => {
        const valueLeft = input.getBoundingClientRect().left + parseFloat(getComputedStyle(input).paddingLeft);

        expect(valueLeft).toBeCloseTo(label.getBoundingClientRect().left, 1);
      });

      it('stacks the floating label and the value as one block', () => {
        const style = getComputedStyle(input);
        const paddingTop = parseFloat(style.paddingTop);
        const contentHeight = input.clientHeight - paddingTop - parseFloat(style.paddingBottom);
        const innerTop = fieldBox.getBoundingClientRect().top + parseFloat(getComputedStyle(fieldBox).borderTopWidth);

        const labelRect = label.getBoundingClientRect();
        const labelBottom = labelRect.top - innerTop + labelRect.height;
        const valueTop = paddingTop + (contentHeight - parseFloat(style.lineHeight)) / 2;

        expect(labelBottom).toBeCloseTo(rem(1.6125), 1);
        expect(valueTop).toBeCloseTo(labelBottom, 1);
      });
    });
  }
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

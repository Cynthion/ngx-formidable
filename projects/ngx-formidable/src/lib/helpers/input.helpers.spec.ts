import { fakeAsync, tick } from '@angular/core/testing';
import { keepClickedCaret, placeCaretAtNextSlot, replaceText } from './input.helpers';

/**
 * The caret rules a masked field keeps, on the helpers that carry them. The fields themselves are covered
 * by `components/fields/caret.spec.ts`; these are the three decisions behind them.
 */
describe('input helpers', () => {
  let element: HTMLInputElement;

  beforeEach(() => {
    element = document.createElement('input');
    document.body.appendChild(element);
  });

  afterEach(() => element.remove());

  describe('replaceText', () => {
    it('writes text the element does not show, with the caret behind it', () => {
      element.value = 'old';

      replaceText(element, 'a longer value');

      expect(element.value).toBe('a longer value');
      expect(element.selectionStart).toBe('a longer value'.length);
    });

    it('leaves the caret alone when the text is already there', () => {
      element.value = 'unchanged';
      element.setSelectionRange(3, 3);

      replaceText(element, 'unchanged');

      expect(element.selectionStart).toBe(3);
    });

    it('leaves a selection alone too', () => {
      element.value = 'unchanged';
      element.setSelectionRange(2, 6);

      replaceText(element, 'unchanged');

      expect([element.selectionStart, element.selectionEnd]).toEqual([2, 6]);
    });
  });

  describe('placeCaretAtNextSlot', () => {
    it('puts the caret at the first unfilled slot', () => {
      element.value = '079 ___ __ __';

      placeCaretAtNextSlot(element);

      expect(element.selectionStart).toBe(4);
    });

    it('puts it at the front of a field that is nothing but slots', () => {
      element.value = '___ ___ __ __';
      element.setSelectionRange(6, 6);

      placeCaretAtNextSlot(element);

      expect(element.selectionStart).toBe(0);
    });

    it('puts it at the end once there are no slots left', () => {
      element.value = '079 123 45 67';
      element.setSelectionRange(2, 2);

      placeCaretAtNextSlot(element);

      expect(element.selectionStart).toBe('079 123 45 67'.length);
    });
  });

  describe('keepClickedCaret', () => {
    it('restores the caret the pointer set, after the mask has moved it', fakeAsync(() => {
      element.value = '079 ___ __ __';
      element.setSelectionRange(8, 8);

      keepClickedCaret(element, true);
      // what ngx-mask does between the mouseup and the restore
      element.setSelectionRange(4, 4);
      tick();

      expect(element.selectionStart).toBe(8);
    }));

    it('restores a dragged selection, not just a caret', fakeAsync(() => {
      element.value = '079 123 45 67';
      element.setSelectionRange(2, 9);

      keepClickedCaret(element, true);
      element.setSelectionRange(4, 4);
      tick();

      expect([element.selectionStart, element.selectionEnd]).toEqual([2, 9]);
    }));

    it('leaves a field of nothing but slots to the mask', fakeAsync(() => {
      element.value = '___ ___ __ __';
      element.setSelectionRange(6, 6);

      keepClickedCaret(element, false);
      element.setSelectionRange(0, 0);
      tick();

      expect(element.selectionStart).toBe(0);
    }));
  });
});

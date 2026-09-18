import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FORMIDABLE_VALIDATOR, IFormidableValidator, WHOLE_FORM } from '@cynthion/ngx-formidable';
import { firstValueFrom } from 'rxjs';
import { create, enforce, mode, Modes, only, test } from 'vest';
import { NgxFormidableVestValidatorDirective } from './vest-validator.directive';

/**
 * Contract of the Vest adapter: it is the whole of the library's Vest knowledge. It provides
 * `FORMIDABLE_VALIDATOR` and maps `result.getErrors(target)` to the message array the harness reports.
 */

interface Model extends Record<string, unknown> {
  name?: string;
  nickname?: string;
  passwords?: { password?: string };
}

const suite = create((model: Model, field?: string) => {
  if (field) only(field);

  // Explicit, because Vest 6 defaults to `EAGER` where Vest 5 defaulted to `ALL`: without this the suite
  // stops at a field's first failure and the pass-through-every-message contract below cannot be tested.
  mode(Modes.ALL);

  // Async, so the adapter's thenable path is covered: Vest 6 dropped `done()`, and a run result that
  // settles only once its async tests do is the whole of what replaced it.
  test('nickname', 'Nickname is taken.', async () => {
    await Promise.resolve();
    enforce(model.nickname).notEquals('taken');
  });

  test('name', 'Name is required.', () => {
    enforce(model.name).isNotBlank();
  });

  test('name', 'Name must start with A.', () => {
    enforce(model.name?.toLowerCase()).startsWith('a');
  });

  test('passwords.password', 'Password is required.', () => {
    enforce(model.passwords?.password).isNotBlank();
  });

  test(WHOLE_FORM, 'Nice try.', () => {
    enforce(model.name === 'Cheat').isFalsy();
  });
});

@Component({
  imports: [NgxFormidableVestValidatorDirective],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<form [formSuite]="suite"></form>`
})
class HostComponent {
  suite = suite;
}

describe('NgxFormidableVestValidatorDirective', () => {
  let validator: IFormidableValidator<Model>;

  beforeEach(() => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    validator = fixture.debugElement
      .query((node) => node.name === 'form')
      .injector.get(FORMIDABLE_VALIDATOR) as IFormidableValidator<Model>;
  });

  it('provides itself as the FORMIDABLE_VALIDATOR of its form', () => {
    expect(validator).toBeInstanceOf(NgxFormidableVestValidatorDirective);
  });

  it('reports every failing message for the requested field path', async () => {
    await expectAsync(firstValueFrom(validator.validate({}, 'name'))).toBeResolvedTo([
      'Name is required.',
      'Name must start with A.'
    ]);
  });

  it('reports null when the field passes', async () => {
    await expectAsync(firstValueFrom(validator.validate({ name: 'Anna' }, 'name'))).toBeResolvedTo(null);
  });

  // `only(field)` means a suite run for one path must stay silent about every other path.
  it('reports only the requested path, not the whole model', async () => {
    await expectAsync(firstValueFrom(validator.validate({}, 'passwords.password'))).toBeResolvedTo([
      'Password is required.'
    ]);
  });

  it('reports root-level rules under the WHOLE_FORM path', async () => {
    await expectAsync(firstValueFrom(validator.validate({ name: 'Cheat' }, WHOLE_FORM))).toBeResolvedTo(['Nice try.']);
    await expectAsync(firstValueFrom(validator.validate({ name: 'Anna' }, WHOLE_FORM))).toBeResolvedTo(null);
  });

  // Vest 5 waited for async tests through `done()`; Vest 6's run result is a thenable instead. Without
  // awaiting it the adapter would report `null` here, because the rule has not settled yet.
  it('waits for an async rule before reporting its message', async () => {
    await expectAsync(firstValueFrom(validator.validate({ nickname: 'taken' }, 'nickname'))).toBeResolvedTo([
      'Nickname is taken.'
    ]);
  });

  it('reports null when an async rule passes', async () => {
    await expectAsync(firstValueFrom(validator.validate({ nickname: 'free' }, 'nickname'))).toBeResolvedTo(null);
  });

  it('reports null for a path the suite has no rules for', async () => {
    await expectAsync(firstValueFrom(validator.validate({}, 'unknown'))).toBeResolvedTo(null);
  });

  it('reports null when no suite is bound', async () => {
    const bare = TestBed.createComponent(BareHostComponent);
    bare.detectChanges();

    const bareValidator = bare.debugElement
      .query((node) => node.name === 'form')
      .injector.get(FORMIDABLE_VALIDATOR) as IFormidableValidator<Model>;

    await expectAsync(firstValueFrom(bareValidator.validate({}, 'name'))).toBeResolvedTo(null);
  });
});

@Component({
  imports: [NgxFormidableVestValidatorDirective],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<form [formSuite]="null"></form>`
})
class BareHostComponent {}

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FORMIDABLE_VALIDATOR, IFormidableValidator, WHOLE_FORM } from '@cynthion/ngx-formidable';
import { firstValueFrom } from 'rxjs';
import { enforce, only, staticSuite, test } from 'vest';
import { NgxFormidableVestValidatorDirective } from './vest-validator.directive';

/**
 * Contract of the Vest adapter: it is the whole of the library's Vest knowledge. It provides
 * `FORMIDABLE_VALIDATOR` and maps `result.getErrors()[target]` to the message array the harness reports.
 */

interface Model extends Record<string, unknown> {
  name?: string;
  passwords?: { password?: string };
}

const suite = staticSuite((model: Model, field?: string) => {
  if (field) only(field);

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
  standalone: true,
  imports: [NgxFormidableVestValidatorDirective],
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
  standalone: true,
  imports: [NgxFormidableVestValidatorDirective],
  template: `<form [formSuite]="null"></form>`
})
class BareHostComponent {}

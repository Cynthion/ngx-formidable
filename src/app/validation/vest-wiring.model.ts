import { DeepPartial, WHOLE_FORM } from '@cynthion/ngx-formidable';
import { create, enforce, mode, Modes, omitWhen, only, Suite, test } from 'vest';

/**
 * The model and Vest suite the validation integration spec drives.
 *
 * It stays a hand-written, nested model with a `ngModelGroup` in it, which is what the spec needs: the
 * portal's own preview form is flat and generated, so a group rule would have nothing to report on there.
 */

// #region FormModel

export interface Password {
  password: string;
  confirmPassword?: string;
}

type UserGender = 'male' | 'female' | 'unspecified';
type UserNationality = 'ch' | 'de' | 'fr' | 'jp' | 'other';
type UserReligion =
  'christian' | 'islam' | 'hindu' | 'buddhism' | 'buddhist' | 'agnostic' | 'atheist' | 'custom' | 'none';

interface User {
  firstName: string;
  middleName: string;
  lastName: string;
  gender?: UserGender;
  nationality?: UserNationality;
  hobby?: string;
  animal?: string;
  birthdate?: Date;
  time?: Date;
  religion?: UserReligion;
  allergies?: string[];
  isSingle?: boolean;
  age?: number;
  passwords: Password;
  pets: number;
}

export type VestWiringModel = DeepPartial<User>;

// #endregion

// #region FormModel Validation

export const vestWiringSuite: Suite<string, string, (model: VestWiringModel, field?: string) => void> = create(
  (model: VestWiringModel, field?: string) => {
    mode(Modes.ALL); // use EAGER to just use first

    if (field) {
      only(field);
    }

    // A whole-form rule: it reads two fields and reports on neither of them.
    test(WHOLE_FORM, `Test user, your password should not be '1234'!`, () => {
      enforce(model.firstName === 'Test' && model.passwords?.password === '1234').isFalsy();
    });

    test('firstName', 'First name is required.', () => {
      enforce(model.firstName).isNotBlank();
    });

    test('firstName', 'First name does not start with T.', () => {
      enforce(model.firstName?.toLowerCase()).startsWith('t');
    });

    test('lastName', 'Last name is required.', () => {
      enforce(model.lastName).isNotBlank();
    });

    // A custom field validates like any other: the rule names it, nothing knows it is not a library field.
    test('pets', 'Three pets is plenty.', () => {
      enforce(model.pets ?? 0).lessThanOrEquals(3);
    });

    test('passwords.password', 'Password is required.', () => {
      enforce(model.passwords?.password).isNotBlank();
    });

    omitWhen(!model.passwords?.password, () => {
      test('passwords.confirmPassword', 'Confirm password is required.', () => {
        enforce(model.passwords?.confirmPassword).isNotBlank();
      });
    });

    omitWhen(!model.passwords?.password || !model.passwords?.confirmPassword, () => {
      test('passwords', 'Passwords do not match!', () => {
        enforce(model.passwords?.confirmPassword).equals(model.passwords?.password);
      });
    });
  }
);

// #endregion

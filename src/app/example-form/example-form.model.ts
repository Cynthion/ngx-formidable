import { DeepPartial, DeepRequired, IFormidableFieldOption, ROOT_FORM } from 'ngx-formidable';
import { enforce, mode, Modes, omitWhen, only, StaticSuite, staticSuite, test } from 'vest';

// #region FormModel

export interface Password {
  password: string;
  confirmPassword?: string;
}

export type UserGender = 'male' | 'female';
export type UserNationality = 'ch' | 'de' | 'fr' | 'jp';
export type UserReligion =
  | 'christian'
  | 'islam'
  | 'hindu'
  | 'buddhism'
  | 'buddhist'
  | 'agnostic'
  | 'atheist'
  | 'custom';

export interface User {
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
  passwords: Password;
  color: string;
}

export type ExampleFormModel = DeepPartial<User>;

// #endregion

// #region FormModel Validation

export type ExampleFormFrame = DeepRequired<ExampleFormModel>;

export const exampleFormFrame: ExampleFormFrame = {
  firstName: '',
  middleName: '',
  lastName: '',
  gender: 'male',
  nationality: 'ch',
  hobby: '',
  animal: '',
  birthdate: new Date(),
  time: new Date(0, 0, 0, 0, 0, 0, 0),
  religion: 'hindu',
  allergies: [],
  isSingle: false,
  passwords: {
    password: '',
    confirmPassword: ''
  },
  color: '#000000'
};

export const exampleFormValidationSuite: StaticSuite<
  string,
  string,
  (model: ExampleFormModel, field?: string) => void
> = staticSuite((model: ExampleFormModel, field?: string) => {
  mode(Modes.ALL); // use EAGER to just use first

  if (field) {
    only(field);
  }

  test(ROOT_FORM, `Test User, your PW should not be '1234'!`, () => {
    enforce(model.firstName === 'Test' && model.lastName === 'User' && model.passwords?.password === '1234').isFalsy();
  });

  test('firstName', 'First name is required.', () => {
    enforce(model.firstName).isNotBlank();
  });

  test('firstName', 'First name does not start with A.', () => {
    enforce(model.firstName?.toLowerCase()).startsWith('a');
  });

  test('firstName', 'First name does not start with B.', () => {
    enforce(model.firstName?.toLowerCase()).startsWith('b');
  });

  test('lastName', 'Last name is required.', () => {
    enforce(model.lastName).isNotBlank();
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
});

// #endregion

// #region Custom Models, etc.

export interface HighlightEntry {
  text: string;
  isHighlighted: boolean;
}

export interface HighlightedEntries {
  labelEntries: HighlightEntry[];
  subtitleEntries: HighlightEntry[];
}

export interface AnimalFormFieldOption extends IFormidableFieldOption {
  subtitle?: string;
  highlightedEntries?: HighlightedEntries;
}

// #endregion

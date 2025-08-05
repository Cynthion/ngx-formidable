import { DeepPartial, DeepRequired, IFormidableFieldOption, ROOT_FORM } from 'ngx-formidable';
import { enforce, omitWhen, only, staticSuite, test } from 'vest';

//#region FormModel

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
  lastName: string;
  gender?: UserGender;
  nationality?: UserNationality;
  hobby?: string;
  animal?: string;
  birthdate?: Date;
  time?: Date;
  religion?: UserReligion;
  allergies?: string[];
  passwords: Password;
}

export type ExampleFormModel = DeepPartial<User>;

//#endregion

//#region FormModel Validation

export type ExampleFormShape = DeepRequired<ExampleFormModel>;

export const exampleFormShape: ExampleFormShape = {
  firstName: '',
  lastName: '',
  gender: 'male', // TODO how to use undefined in shape?
  nationality: 'ch',
  hobby: '',
  animal: '',
  birthdate: new Date(),
  time: new Date(0, 0, 0, 0, 0, 0, 0),
  religion: 'hindu',
  allergies: [],
  passwords: {
    password: '',
    confirmPassword: ''
  }
};

export const exampleFormValidationSuite = staticSuite((model: ExampleFormModel, field?: string) => {
  if (field) {
    only(field);
  }

  test(ROOT_FORM, `Test User, your PW should not be '1234'!`, () => {
    enforce(model.firstName === 'Test' && model.lastName === 'User' && model.passwords?.password === '1234').isFalsy();
  });

  test('firstName', 'First name is required.', () => {
    enforce(model.firstName).isNotBlank();
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

//#endregion

//#region Custom Models, etc.

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

//#endregion

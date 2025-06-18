import { TestBed } from '@angular/core/testing';

import { FormzService } from './formz.service';

describe('FormzService', () => {
  let service: FormzService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FormzService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

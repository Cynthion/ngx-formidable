import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormzModule } from 'formz';
import { AppComponent } from './app.component';
import { ExampleFormComponent } from './example-form/example-form.component';
import { FuzzyFieldOptionComponent } from './fuzzy-field-option/fuzzy-option.component';

@NgModule({
  declarations: [AppComponent, ExampleFormComponent, FuzzyFieldOptionComponent],
  imports: [CommonModule, BrowserModule, BrowserAnimationsModule, FormzModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}

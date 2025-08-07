import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgxFormidableModule } from 'ngx-formidable';
import { AppComponent } from './app.component';
import { CustomColorPickerComponent } from './custom-color-picker/custom-color-picker.component';
import { ExampleFormComponent } from './example-form/example-form.component';
import { FuzzyFieldOptionComponent } from './fuzzy-field-option/fuzzy-option.component';

@NgModule({
  declarations: [AppComponent, ExampleFormComponent, FuzzyFieldOptionComponent, CustomColorPickerComponent],
  imports: [CommonModule, BrowserModule, BrowserAnimationsModule, NgxFormidableModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}

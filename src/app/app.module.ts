import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ExampleTooltipComponent, NgxFormidableModule } from 'ngx-formidable';
import { AppComponent } from './app.component';
import { ExampleCustomColorPickerComponent } from './example-custom-color-picker/example-custom-color-picker.component';
import { ExampleFormComponent } from './example-form/example-form.component';
import { ExampleFuzzyOptionComponent } from './example-fuzzy-option/example-fuzzy-option.component';

@NgModule({
  declarations: [
    AppComponent,
    ExampleFormComponent,
    ExampleTooltipComponent,
    ExampleFuzzyOptionComponent,
    ExampleCustomColorPickerComponent
  ],
  imports: [CommonModule, BrowserModule, BrowserAnimationsModule, NgxFormidableModule.forRoot()],
  bootstrap: [AppComponent]
})
export class AppModule {}

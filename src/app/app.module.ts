import { NgModule } from "@angular/core";
import { AppComponent } from "./app.component";
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { FormzModule } from "formz";
import { ExampleFormComponent } from "./example-form/example-form.component";
import { CommonModule } from "@angular/common";

@NgModule({
  declarations: [AppComponent, ExampleFormComponent],
  imports: [
    CommonModule,
    BrowserModule,
    BrowserAnimationsModule,
    FormzModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}

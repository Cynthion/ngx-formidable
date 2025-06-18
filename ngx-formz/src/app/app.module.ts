import { NgModule } from "@angular/core";
import { AppComponent } from "./app.component";
import { BrowserModule } from "@angular/platform-browser";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { FormzModule } from "projects/formz/src/lib/formz.module";
import { ExampleFormComponent } from "./example-form/example-form.component";

@NgModule({
  declarations: [AppComponent, ExampleFormComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormzModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}

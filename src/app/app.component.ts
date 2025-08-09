import { Component } from '@angular/core';
import { ExampleFormComponent } from './example-form/example-form.component';

@Component({
  selector: 'app',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: true,
  imports: [ExampleFormComponent]
})
export class AppComponent {}

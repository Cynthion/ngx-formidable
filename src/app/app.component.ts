import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ExampleFormComponent } from './example-form/example-form.component';

@Component({
  selector: 'app',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ExampleFormComponent]
})
export class AppComponent {}

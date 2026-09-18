import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'example-icon',
  templateUrl: './example-icon.component.html',
  styleUrls: ['./example-icon.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule]
})
export class ExampleIconComponent {
  readonly svg = input('');
  readonly size = input(32);
  readonly color = input('currentColor');

  private readonly sanitizer = inject(DomSanitizer);

  protected readonly sanitizedSvg = computed<SafeHtml>(() => this.sanitizer.bypassSecurityTrustHtml(this.svg()));
}

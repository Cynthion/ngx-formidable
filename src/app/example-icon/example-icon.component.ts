import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'example-icon',
  templateUrl: './example-icon.component.html',
  styleUrls: ['./example-icon.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule]
})
export class ExampleIconComponent {
  @Input() set svg(val: string) {
    this.sanitizedSvg = this.sanitizer.bypassSecurityTrustHtml(val);
  }
  @Input() size = 32;
  @Input() color = 'currentColor';

  protected sanitizedSvg: SafeHtml = '';

  constructor(private sanitizer: DomSanitizer) {}
}

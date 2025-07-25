import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'formz-icon',
  templateUrl: './icon.component.html',
  styleUrls: ['./icon.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IconComponent {
  @Input() set svg(val: string) {
    this.sanitizedSvg = this.sanitizer.bypassSecurityTrustHtml(val);
  }
  @Input() size = 32;
  @Input() color = 'currentColor';

  protected sanitizedSvg: SafeHtml = '';

  constructor(private sanitizer: DomSanitizer) {}
}

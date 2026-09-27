import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'example-icon',
  templateUrl: './example-icon.html',
  styleUrls: ['./example-icon.scss']
})
export class ExampleIcon {
  readonly svg = input('');
  readonly size = input(32);
  readonly color = input('currentColor');

  private readonly sanitizer = inject(DomSanitizer);

  protected readonly sanitizedSvg = computed<SafeHtml>(() => this.sanitizer.bypassSecurityTrustHtml(this.svg()));
}

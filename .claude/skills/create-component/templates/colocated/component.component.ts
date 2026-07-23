import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  // feature: cmp-name   |   view: cmp-<view>-name
  selector: 'cmp-scope-name',
  templateUrl: './name.component.html',
  styleUrls: ['./name.component.scss']
})
export class NameComponent {
  @Input() data?: unknown;

  @Output() submitClick = new EventEmitter<unknown>();
}

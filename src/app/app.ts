import { Component } from '@angular/core';
import { MusicPlayerComponent } from './music-player/music-player.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MusicPlayerComponent],
  template: '<app-music-player></app-music-player>'
})
export class App {}
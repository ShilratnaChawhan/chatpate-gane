
import {
  Component,
  ElementRef,
  ViewChild
} from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';

import {
  MUSIC_LIBRARY,
  Song
} from './music-library.generated';

@Component({
  selector: 'app-music-player',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './music-player.component.html',
  styleUrls: ['./music-player.component.css']
})
export class MusicPlayerComponent {

  @ViewChild('audioPlayer')
  audioPlayer!: ElementRef<HTMLAudioElement>;

  songs: Song[] = [...MUSIC_LIBRARY];

  filteredSongs: Song[] = [...MUSIC_LIBRARY];

  currentSong: Song | null = null;

  isPlaying = false;
  isShuffle = false;
  repeatMode: 'off' | 'all' | 'one' = 'off';

  searchText = '';

  currentTime = 0;
  duration = 0;
  volume = 0.8;

  errorMessage = '';

  get progress(): number {
    if (!this.duration || !Number.isFinite(this.duration)) {
      return 0;
    }

    return (this.currentTime / this.duration) * 100;
  }

  get currentIndex(): number {
    return this.songs.findIndex(
      song => song.id === this.currentSong?.id
    );
  }

  filterSongs(): void {
    const search = this.searchText.toLowerCase().trim();

    this.filteredSongs = this.songs.filter(song =>
      song.title.toLowerCase().includes(search) ||
      song.artist.toLowerCase().includes(search)
    );
  }

  async playSong(song: Song): Promise<void> {
    const audio = this.audioPlayer.nativeElement;

    this.currentSong = song;
    this.currentTime = 0;
    this.duration = 0;
    this.errorMessage = '';

    audio.src = song.url;
    audio.volume = this.volume;
    audio.load();

    try {
      await audio.play();
      this.isPlaying = true;
    } catch (error) {
      this.isPlaying = false;

      console.error('Audio playback error:', error);

      this.errorMessage =
        'Unable to play this song. Check the MP3 file and URL.';
    }
  }

  async togglePlay(): Promise<void> {
    const audio = this.audioPlayer.nativeElement;

    if (!this.currentSong) {
      if (this.songs.length > 0) {
        await this.playSong(this.songs[0]);
      }
      return;
    }

    if (audio.paused) {
      try {
        await audio.play();
        this.isPlaying = true;
        this.errorMessage = '';
      } catch (error) {
        console.error(error);
        this.isPlaying = false;
        this.errorMessage = 'Unable to start audio playback.';
      }
    } else {
      audio.pause();
      this.isPlaying = false;
    }
  }

  async nextSong(): Promise<void> {
    if (!this.songs.length) return;

    let nextIndex: number;

    if (this.isShuffle && this.songs.length > 1) {
      do {
        nextIndex = Math.floor(Math.random() * this.songs.length);
      } while (nextIndex === this.currentIndex);
    } else {
      nextIndex = this.currentIndex + 1;

      if (nextIndex >= this.songs.length) {
        if (this.repeatMode === 'all') {
          nextIndex = 0;
        } else {
          this.isPlaying = false;
          return;
        }
      }
    }

    await this.playSong(this.songs[nextIndex]);
  }

  async previousSong(): Promise<void> {
    if (!this.songs.length) return;

    const audio = this.audioPlayer.nativeElement;

    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    let previousIndex = this.currentIndex - 1;

    if (previousIndex < 0) {
      previousIndex = this.repeatMode === 'all'
        ? this.songs.length - 1
        : 0;
    }

    await this.playSong(this.songs[previousIndex]);
  }

  onSongEnded(): void {
    if (this.repeatMode === 'one' && this.currentSong) {
      const audio = this.audioPlayer.nativeElement;
      audio.currentTime = 0;

      audio.play().catch(error => {
        console.error(error);
        this.isPlaying = false;
      });

      return;
    }

    this.nextSong();
  }

  toggleShuffle(): void {
    this.isShuffle = !this.isShuffle;
  }

  toggleRepeat(): void {
    if (this.repeatMode === 'off') {
      this.repeatMode = 'all';
    } else if (this.repeatMode === 'all') {
      this.repeatMode = 'one';
    } else {
      this.repeatMode = 'off';
    }
  }

  updateTime(): void {
    const audio = this.audioPlayer.nativeElement;

    this.currentTime = audio.currentTime;
  }

  updateDuration(): void {
    const audio = this.audioPlayer.nativeElement;

    this.duration = Number.isFinite(audio.duration)
      ? audio.duration
      : 0;
  }

  seek(event: Event): void {
    const input = event.target as HTMLInputElement;
    const audio = this.audioPlayer.nativeElement;

    if (!this.duration) return;

    audio.currentTime = Number(input.value);
    this.currentTime = audio.currentTime;
  }

  changeVolume(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.volume = Number(input.value);

    this.audioPlayer.nativeElement.volume = this.volume;
  }

  onAudioError(): void {
    const audio = this.audioPlayer.nativeElement;

    if (!audio.error) return;

    console.error('Audio error details:', {
      source: audio.currentSrc,
      code: audio.error.code,
      message: audio.error.message
    });

    this.isPlaying = false;
    this.errorMessage =
      'Audio could not load. Check the MP3 file path and format.';
  }

  formatTime(seconds: number): string {
    if (!Number.isFinite(seconds)) return '0:00';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  }

  trackById(index: number, song: Song): number {
    return song.id;
  }
}

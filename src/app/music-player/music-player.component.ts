import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
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
  styleUrl: './music-player.component.css'
})
export class MusicPlayerComponent implements OnInit, OnDestroy {

  @ViewChild('audioPlayer')
  audioPlayer!: ElementRef<HTMLAudioElement>;

  songs: Song[] = [...MUSIC_LIBRARY];

  currentSong: Song | null = null;

  isPlaying = false;
  isShuffle = false;

  repeatMode: 'off' | 'all' | 'one' = 'off';

  currentTime = 0;
  duration = 0;
  volume = 0.7;

  searchText = '';

  ngOnInit(): void {
    this.currentSong = this.songs[0] || null;
  }

  async playSong(song: Song): Promise<void> {
    this.currentSong = song;

    const audio = this.audioPlayer.nativeElement;

    audio.pause();
    audio.src = song.src;
    audio.volume = this.volume;
    audio.load();

    this.currentTime = 0;
    this.duration = 0;

    try {
      await audio.play();
      this.isPlaying = true;
    } catch (error) {
      this.isPlaying = false;
      console.error('Audio playback failed:', error);
    }
  }

  async togglePlay(): Promise<void> {
    const audio = this.audioPlayer.nativeElement;

    if (!this.currentSong) {
      return;
    }

    if (audio.paused) {
      try {
        await audio.play();
        this.isPlaying = true;
      } catch (error) {
        console.error(error);
      }
    } else {
      audio.pause();
      this.isPlaying = false;
    }
  }

  async playNext(): Promise<void> {
    if (!this.songs.length || !this.currentSong) return;

    const index = this.songs.findIndex(
      song => song.id === this.currentSong?.id
    );

    let nextIndex: number;

    if (this.isShuffle && this.songs.length > 1) {
      const available = this.songs
        .map((_, i) => i)
        .filter(i => i !== index);

      nextIndex = available[
        Math.floor(Math.random() * available.length)
      ];
    } else {
      nextIndex = (index + 1) % this.songs.length;
    }

    await this.playSong(this.songs[nextIndex]);
  }

  async playPrevious(): Promise<void> {
    if (!this.songs.length || !this.currentSong) return;

    const audio = this.audioPlayer.nativeElement;

    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    const index = this.songs.findIndex(
      song => song.id === this.currentSong?.id
    );

    const previousIndex =
      (index - 1 + this.songs.length) % this.songs.length;

    await this.playSong(this.songs[previousIndex]);
  }

  toggleShuffle(): void {
    this.isShuffle = !this.isShuffle;
  }

  toggleRepeat(): void {
    this.repeatMode =
      this.repeatMode === 'off'
        ? 'all'
        : this.repeatMode === 'all'
          ? 'one'
          : 'off';
  }

  async onSongEnded(): Promise<void> {
    if (this.repeatMode === 'one') {
      const audio = this.audioPlayer.nativeElement;
      audio.currentTime = 0;

      try {
        await audio.play();
        this.isPlaying = true;
      } catch {
        this.isPlaying = false;
      }

      return;
    }

    const index = this.songs.findIndex(
      song => song.id === this.currentSong?.id
    );

    if (
      this.isShuffle ||
      index < this.songs.length - 1 ||
      this.repeatMode === 'all'
    ) {
      await this.playNext();
    } else {
      this.isPlaying = false;
    }
  }

  updateProgress(): void {
    const audio = this.audioPlayer.nativeElement;

    this.currentTime = audio.currentTime || 0;
    this.duration = Number.isFinite(audio.duration)
      ? audio.duration
      : 0;
  }

  seek(event: Event): void {
    const value = Number(
      (event.target as HTMLInputElement).value
    );

    this.audioPlayer.nativeElement.currentTime = value;
    this.currentTime = value;
  }

  changeVolume(event: Event): void {
    this.volume = Number(
      (event.target as HTMLInputElement).value
    );

    this.audioPlayer.nativeElement.volume = this.volume;
  }

  get filteredSongs(): Song[] {
    const search = this.searchText.toLowerCase().trim();

    if (!search) return this.songs;

    return this.songs.filter(song =>
      song.title.toLowerCase().includes(search) ||
      song.artist.toLowerCase().includes(search)
    );
  }

  formatTime(seconds: number): string {
    if (!Number.isFinite(seconds)) return '0:00';

    const minutes = Math.floor(seconds / 60);
    const remaining = Math.floor(seconds % 60);

    return `${minutes}:${remaining.toString().padStart(2, '0')}`;
  }

  ngOnDestroy(): void {
    if (this.audioPlayer) {
      this.audioPlayer.nativeElement.pause();
    }
  }
}
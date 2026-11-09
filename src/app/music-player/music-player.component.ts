
import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnInit,
  OnDestroy
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
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './music-player.component.html',
  styleUrls: ['./music-player.component.css']
})
export class MusicPlayerComponent
  implements OnInit, AfterViewInit, OnDestroy {

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

  autoplayBlocked = false;

  private destroyed = false;

  ngOnInit(): void {
    // Prepare initial song selection.
    // Actual autoplay is attempted after the audio element initializes.
  }

  ngAfterViewInit(): void {

    const audio = this.audioPlayer.nativeElement;

    audio.volume = this.volume;

    // Attempt autoplay after component initialization.
    this.autoPlayMusic();

  }

  // Current song index
  get currentIndex(): number {

    return this.songs.findIndex(
      song => song.id === this.currentSong?.id
    );

  }

  // Search
  filterSongs(): void {

    const search = this.searchText
      .toLowerCase()
      .trim();

    this.filteredSongs = this.songs.filter(song =>
      song.title.toLowerCase().includes(search) ||
      song.artist.toLowerCase().includes(search)
    );

  }

  // Automatic playback attempt
  async autoPlayMusic(): Promise<void> {

    if (!this.songs.length || this.destroyed) return;

    let song: Song;

    if (this.isShuffle && this.songs.length > 1) {

      const index = Math.floor(
        Math.random() * this.songs.length
      );

      song = this.songs[index];

    } else {

      song = this.songs[0];

    }

    await this.playSong(song);

  }

  // Play selected song
  async playSong(song: Song): Promise<void> {

    if (!song || !song.url) {

      this.errorMessage = 'Invalid MP3 file path.';

      return;

    }

    const audio = this.audioPlayer.nativeElement;

    this.currentSong = song;

    this.currentTime = 0;

    this.duration = 0;

    this.errorMessage = '';

    this.autoplayBlocked = false;

    audio.pause();

    audio.src = song.url;

    audio.volume = this.volume;

    audio.load();

    try {

      await audio.play();

      this.isPlaying = true;

    } catch (error) {

      console.warn('Autoplay or playback blocked:', error);

      this.isPlaying = false;

      this.autoplayBlocked = true;

      this.errorMessage =
        'Playback requires your interaction. Tap Play Music.';

    }

  }

  // Hero button
  async playMusic(): Promise<void> {

    if (!this.songs.length) return;

    if (this.isPlaying) {

      await this.togglePlay();

      return;

    }

    if (!this.currentSong) {

      await this.autoPlayMusic();

      return;

    }

    await this.togglePlay();

  }

  // Play / Pause
  async togglePlay(): Promise<void> {

    const audio = this.audioPlayer.nativeElement;

    if (!this.currentSong) {

      await this.autoPlayMusic();

      return;

    }

    if (audio.paused) {

      try {

        await audio.play();

        this.isPlaying = true;

        this.autoplayBlocked = false;

        this.errorMessage = '';

      } catch (error) {

        console.error('Playback failed:', error);

        this.isPlaying = false;

        this.autoplayBlocked = true;

        this.errorMessage =
          'Unable to play audio. Check the MP3 file.';

      }

    } else {

      audio.pause();

      this.isPlaying = false;

    }

  }

  // Shuffle
  async toggleShuffle(): Promise<void> {

    this.isShuffle = !this.isShuffle;

    if (!this.isShuffle || !this.songs.length) return;

    if (this.songs.length === 1) {

      if (!this.currentSong) {
        await this.playSong(this.songs[0]);
      }

      return;

    }

    const availableSongs = this.songs.filter(
      song => song.id !== this.currentSong?.id
    );

    const randomSong = availableSongs[
      Math.floor(Math.random() * availableSongs.length)
    ];

    await this.playSong(randomSong);

  }

  // Next song
  async nextSong(): Promise<void> {

    if (!this.songs.length) return;

    let nextIndex: number;

    if (this.isShuffle && this.songs.length > 1) {

      const availableSongs = this.songs.filter(
        song => song.id !== this.currentSong?.id
      );

      const randomSong = availableSongs[
        Math.floor(Math.random() * availableSongs.length)
      ];

      nextIndex = this.songs.indexOf(randomSong);

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

  // Previous song
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

  // Ended event
  async onSongEnded(): Promise<void> {

    if (this.repeatMode === 'one' && this.currentSong) {

      const audio = this.audioPlayer.nativeElement;

      audio.currentTime = 0;

      try {

        await audio.play();

      } catch (error) {

        console.error(error);

        this.isPlaying = false;

      }

      return;

    }

    await this.nextSong();

  }

  // Repeat
  toggleRepeat(): void {

    if (this.repeatMode === 'off') {

      this.repeatMode = 'all';

    } else if (this.repeatMode === 'all') {

      this.repeatMode = 'one';

    } else {

      this.repeatMode = 'off';

    }

  }

  // Audio play event
  onAudioPlay(): void {

    this.isPlaying = true;

    this.autoplayBlocked = false;

  }

  // Audio pause event
  onAudioPause(): void {

    this.isPlaying = false;

  }

  // Time update
  updateTime(): void {

    this.currentTime =
      this.audioPlayer.nativeElement.currentTime;

  }

  // Duration update
  updateDuration(): void {

    const audio = this.audioPlayer.nativeElement;

    this.duration = Number.isFinite(audio.duration)
      ? audio.duration
      : 0;

  }

  // Seek
  seek(event: Event): void {

    const input = event.target as HTMLInputElement;

    const audio = this.audioPlayer.nativeElement;

    if (!this.duration) return;

    audio.currentTime = Number(input.value);

    this.currentTime = audio.currentTime;

  }

  // Volume
  changeVolume(event: Event): void {

    const input = event.target as HTMLInputElement;

    this.volume = Number(input.value);

    this.audioPlayer.nativeElement.volume = this.volume;

  }

  // Audio error
  onAudioError(): void {

    const audio = this.audioPlayer.nativeElement;

    if (!audio.error) return;

    console.error('Audio error:', {
      source: audio.currentSrc,
      code: audio.error.code,
      message: audio.error.message
    });

    this.isPlaying = false;

    this.errorMessage =
      'Audio could not load. Check your MP3 file path.';

  }

  // Format time
  formatTime(seconds: number): string {

    if (!Number.isFinite(seconds)) return '0:00';

    const minutes = Math.floor(seconds / 60);

    const remainingSeconds = Math.floor(seconds % 60);

    return `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;

  }

  // Track by ID
  trackById(index: number, song: Song): number {

    return song.id;

  }

  // Cleanup
  ngOnDestroy(): void {

    this.destroyed = true;

    if (this.audioPlayer?.nativeElement) {

      const audio = this.audioPlayer.nativeElement;

      audio.pause();

      audio.removeAttribute('src');

      audio.load();

    }

  }

}

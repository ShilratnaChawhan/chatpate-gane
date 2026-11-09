
import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
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
  implements AfterViewInit, OnDestroy {

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

  ngAfterViewInit(): void {
    this.audioPlayer.nativeElement.volume = this.volume;
  }

  get currentIndex(): number {
    return this.songs.findIndex(
      song => song.id === this.currentSong?.id
    );
  }

  get progress(): number {
    if (!this.duration) return 0;

    return (this.currentTime / this.duration) * 100;
  }

  // Search songs
  filterSongs(): void {

    const search = this.searchText
      .toLowerCase()
      .trim();

    this.filteredSongs = this.songs.filter(song =>
      song.title.toLowerCase().includes(search) ||
      song.artist.toLowerCase().includes(search)
    );

  }

  // Play selected song
  async playSong(song: Song): Promise<void> {

    if (!song || !song.url) {
      this.errorMessage = 'Invalid song or MP3 URL.';
      return;
    }

    const audio = this.audioPlayer.nativeElement;

    this.currentSong = song;

    this.currentTime = 0;
    this.duration = 0;

    this.errorMessage = '';

    audio.pause();

    audio.src = song.url;

    audio.volume = this.volume;

    audio.load();

    try {

      await audio.play();

      this.isPlaying = true;

    } catch (error) {

      console.error('Playback error:', error);

      this.isPlaying = false;

      this.errorMessage =
        'Unable to play this song. Check the MP3 file path.';

    }

  }

  // Hero play button
  async playMusic(): Promise<void> {

    if (!this.songs.length) return;

    if (this.isPlaying) {
      await this.togglePlay();
      return;
    }

    if (!this.currentSong) {

      if (this.isShuffle && this.songs.length > 1) {

        const randomIndex = Math.floor(
          Math.random() * this.songs.length
        );

        await this.playSong(this.songs[randomIndex]);

      } else {

        await this.playSong(this.songs[0]);

      }

      return;
    }

    await this.togglePlay();

  }

  // Play/Pause
  async togglePlay(): Promise<void> {

    const audio = this.audioPlayer.nativeElement;

    if (!this.currentSong) {

      await this.playMusic();

      return;
    }

    if (audio.paused) {

      try {

        await audio.play();

        this.isPlaying = true;
        this.errorMessage = '';

      } catch (error) {

        console.error('Play error:', error);

        this.isPlaying = false;

        this.errorMessage =
          'Unable to start audio playback.';

      }

    } else {

      audio.pause();

      this.isPlaying = false;

    }

  }

  // Shuffle
  async toggleShuffle(): Promise<void> {

    this.isShuffle = !this.isShuffle;

    if (!this.isShuffle) return;

    if (this.songs.length === 0) return;

    let randomIndex = Math.floor(
      Math.random() * this.songs.length
    );

    if (this.songs.length > 1) {

      while (
        this.songs[randomIndex].id === this.currentSong?.id
      ) {

        randomIndex = Math.floor(
          Math.random() * this.songs.length
        );

      }

    }

    await this.playSong(this.songs[randomIndex]);

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

  // Song ended
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

  // Repeat mode
  toggleRepeat(): void {

    if (this.repeatMode === 'off') {

      this.repeatMode = 'all';

    } else if (this.repeatMode === 'all') {

      this.repeatMode = 'one';

    } else {

      this.repeatMode = 'off';

    }

  }

  // Update progress
  updateTime(): void {

    const audio = this.audioPlayer.nativeElement;

    this.currentTime = audio.currentTime;

  }

  // Update duration
  updateDuration(): void {

    const audio = this.audioPlayer.nativeElement;

    this.duration = Number.isFinite(audio.duration)
      ? audio.duration
      : 0;

  }

  // Seek song
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
      'Audio could not load. Check the MP3 file path and format.';

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

    if (this.audioPlayer?.nativeElement) {

      const audio = this.audioPlayer.nativeElement;

      audio.pause();

      audio.removeAttribute('src');

      audio.load();

    }

  }

}

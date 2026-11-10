
import {
  Component,
  ElementRef,
  ViewChild,
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
export class MusicPlayerComponent implements OnDestroy {

  @ViewChild('audioPlayer')
  audioPlayer!: ElementRef<HTMLAudioElement>;

  // =====================================
  // MUSIC LIBRARY
  // =====================================

  songs: Song[] = [...MUSIC_LIBRARY];

  filteredSongs: Song[] = [...MUSIC_LIBRARY];

  currentSong: Song | null = null;

  // =====================================
  // PLAYER STATES
  // =====================================

  isPlaying = false;

  isShuffle = false;

  repeatMode: 'off' | 'all' | 'one' = 'off';

  searchText = '';

  currentTime = 0;

  duration = 0;

  volume = 0.8;

  errorMessage = '';

  autoplayBlocked = false;

  // =====================================
  // SKIP INTRO SETTINGS
  // =====================================

  // 0 = Off
  // 5, 10, 15, 20, 30 = Seconds

  skipIntroSeconds = 0;

  // =====================================
  // AUTO NEXT SETTINGS
  // =====================================

  // Auto Next is based on TOTAL SONG TIME.
  //
  // 0   = Full Song
  // 30  = 30 seconds
  // 60  = 1 minute
  // 120 = 2 minutes
  // 180 = 3 minutes
  // 300 = 5 minutes

  autoNextDuration = 0;

  // =====================================
  // PLAYBACK CONTROL VARIABLES
  // =====================================

  // Prevent duplicate next-song operations.

  private isAdvancing = false;

  // Prevent Auto Next from triggering
  // more than once for the same song.

  private autoNextTriggered = false;

  // Prevent outdated song loading operations.

  private loadRequestId = 0;

  // Prevent operations after destruction.

  private destroyed = false;

  // =====================================
  // CURRENT SONG INDEX
  // =====================================

  get currentIndex(): number {

    return this.songs.findIndex(
      song => song.id === this.currentSong?.id
    );

  }

  // =====================================
  // SEARCH SONGS
  // =====================================

  filterSongs(): void {

    const search = this.searchText
      .toLowerCase()
      .trim();

    this.filteredSongs = this.songs.filter(song =>

      song.title.toLowerCase().includes(search) ||

      song.artist.toLowerCase().includes(search)

    );

  }

  // =====================================
  // WAIT FOR AUDIO METADATA
  // =====================================

  private waitForMetadata(
    audio: HTMLAudioElement
  ): Promise<void> {

    if (
      audio.readyState >= HTMLMediaElement.HAVE_METADATA
    ) {

      return Promise.resolve();

    }

    return new Promise((resolve, reject) => {

      const cleanup = () => {

        audio.removeEventListener(
          'loadedmetadata',
          onLoaded
        );

        audio.removeEventListener(
          'error',
          onError
        );

      };

      const onLoaded = () => {

        cleanup();

        resolve();

      };

      const onError = () => {

        cleanup();

        reject(
          new Error('Unable to load MP3 file.')
        );

      };

      audio.addEventListener(
        'loadedmetadata',
        onLoaded,
        { once: true }
      );

      audio.addEventListener(
        'error',
        onError,
        { once: true }
      );

    });

  }

  // =====================================
  // PLAY SELECTED SONG
  // =====================================

  async playSong(song: Song): Promise<void> {

    if (this.destroyed) return;

    if (!song || !song.url) {

      this.errorMessage = 'Invalid MP3 file path.';

      return;

    }

    const audio = this.audioPlayer.nativeElement;

    const requestId = ++this.loadRequestId;

    // Stop previous song.

    audio.pause();

    this.currentSong = song;

    this.currentTime = 0;

    this.duration = 0;

    this.autoNextTriggered = false;

    this.isPlaying = false;

    this.errorMessage = '';

    this.autoplayBlocked = false;

    // Set new audio source.

    audio.src = song.url;

    audio.volume = this.volume;

    const metadataPromise = this.waitForMetadata(audio);

    audio.load();

    try {

      // Wait for MP3 metadata.

      await metadataPromise;

      // Ignore outdated requests.

      if (
        this.destroyed ||
        requestId !== this.loadRequestId
      ) {

        return;

      }

      this.duration = Number.isFinite(audio.duration)
        ? audio.duration
        : 0;

      // =====================================
      // INTRO SKIP
      // =====================================

      const skipTime = Math.min(

        this.skipIntroSeconds,

        Math.max(0, audio.duration - 0.5)

      );

      // Start song after Intro Skip.

      audio.currentTime = skipTime;

      this.currentTime = skipTime;

      // IMPORTANT:
      // Auto Next uses total song position.
      // Do not add Intro Skip duration.

      this.autoNextTriggered = false;

      // =====================================
      // START PLAYBACK
      // =====================================

      await audio.play();

      if (
        this.destroyed ||
        requestId !== this.loadRequestId
      ) {

        audio.pause();

        return;

      }

      this.isPlaying = true;

      // Check immediately in case the selected
      // Intro Skip is already beyond Auto Next.

      this.checkAutoNext();

    } catch (error) {

      if (requestId !== this.loadRequestId) {

        return;

      }

      console.error('Playback failed:', error);

      this.isPlaying = false;

      this.autoplayBlocked = true;

      this.errorMessage =
        'Unable to play audio. Check your MP3 file path.';

    }

  }

  // =====================================
  // HERO PLAY BUTTON
  // =====================================

  async playMusic(): Promise<void> {

    if (!this.songs.length) return;

    if (this.isPlaying) {

      await this.togglePlay();

      return;

    }

    if (!this.currentSong) {

      await this.playSong(this.songs[0]);

      return;

    }

    await this.togglePlay();

  }

  // =====================================
  // PLAY / PAUSE
  // =====================================

  async togglePlay(): Promise<void> {

    const audio = this.audioPlayer.nativeElement;

    if (!this.currentSong) {

      if (this.songs.length) {

        await this.playSong(this.songs[0]);

      }

      return;

    }

    if (audio.paused) {

      try {

        await audio.play();

        this.isPlaying = true;

        this.autoplayBlocked = false;

        this.errorMessage = '';

        this.checkAutoNext();

      } catch (error) {

        console.error('Playback failed:', error);

        this.isPlaying = false;

        this.autoplayBlocked = true;

        this.errorMessage =
          'Unable to play audio. Check the MP3 file.';

      }

    } else {

      audio.pause();

    }

  }

  // =====================================
  // SHUFFLE
  // =====================================

  async toggleShuffle(): Promise<void> {

    this.isShuffle = !this.isShuffle;

    if (
      this.isShuffle &&
      this.songs.length > 1 &&
      this.currentSong
    ) {

      await this.nextSong();

    }

  }

  // =====================================
  // NEXT SONG
  // =====================================

  async nextSong(): Promise<void> {

    if (
      !this.songs.length ||
      this.isAdvancing ||
      this.destroyed
    ) {

      return;

    }

    this.isAdvancing = true;

    try {

      let nextIndex: number;

      // =====================================
      // SHUFFLE MODE
      // =====================================

      if (
        this.isShuffle &&
        this.songs.length > 1
      ) {

        const availableSongs = this.songs.filter(
          song => song.id !== this.currentSong?.id
        );

        const randomSong = availableSongs[
          Math.floor(
            Math.random() * availableSongs.length
          )
        ];

        nextIndex = this.songs.indexOf(randomSong);

      } else {

        // =====================================
        // NORMAL NEXT SONG
        // =====================================

        nextIndex = this.currentIndex + 1;

        // Reached last song.

        if (nextIndex >= this.songs.length) {

          // Repeat all songs.

          if (this.repeatMode === 'all') {

            nextIndex = 0;

          } else {

            // Stop after last song.

            const audio = this.audioPlayer.nativeElement;

            audio.pause();

            this.isPlaying = false;

            this.currentTime = 0;

            return;

          }

        }

      }

      // Play next song.

      if (
        nextIndex >= 0 &&
        this.songs[nextIndex]
      ) {

        await this.playSong(
          this.songs[nextIndex]
        );

      }

    } finally {

      this.isAdvancing = false;

    }

  }

  // =====================================
  // PREVIOUS SONG
  // =====================================

  async previousSong(): Promise<void> {

    if (!this.songs.length) return;

    const audio = this.audioPlayer.nativeElement;

    // Restart current song if already played
    // for more than 3 seconds.

    if (audio.currentTime > 3) {

      const target = Math.min(

        this.skipIntroSeconds,

        Math.max(0, audio.duration - 0.5)

      );

      audio.currentTime = target;

      this.currentTime = target;

      this.autoNextTriggered = false;

      this.checkAutoNext();

      return;

    }

    let previousIndex = this.currentIndex - 1;

    if (previousIndex < 0) {

      previousIndex = this.repeatMode === 'all'
        ? this.songs.length - 1
        : 0;

    }

    await this.playSong(
      this.songs[previousIndex]
    );

  }

  // =====================================
  // SKIP INTRO
  // =====================================

  applyIntroSkip(): void {

    if (this.destroyed) return;

    const audio = this.audioPlayer.nativeElement;

    if (
      !this.currentSong ||
      audio.readyState < HTMLMediaElement.HAVE_METADATA
    ) {

      return;

    }

    // Skip only when still inside selected intro.

    if (
      audio.currentTime < this.skipIntroSeconds
    ) {

      const target = Math.min(

        this.skipIntroSeconds,

        Math.max(0, audio.duration - 0.5)

      );

      audio.currentTime = target;

      this.currentTime = target;

      // Do not add intro time to Auto Next.
      // Auto Next always checks audio.currentTime.

      this.autoNextTriggered = false;

    }

    // Check Auto Next after changing Intro Skip.

    this.checkAutoNext();

  }

  // =====================================
  // APPLY AUTO NEXT SETTINGS
  // =====================================

  applyAutoNext(): void {

    if (this.destroyed) return;

    // Reset trigger so the newly selected
    // duration is checked immediately.

    this.autoNextTriggered = false;

    this.checkAutoNext();

  }

  // =====================================
  // AUTO NEXT CHECK
  // =====================================

  private checkAutoNext(): void {

    if (

      this.destroyed ||

      !this.currentSong ||

      !this.isPlaying ||

      this.autoNextDuration <= 0 ||

      this.isAdvancing ||

      this.autoNextTriggered

    ) {

      return;

    }

    const audio = this.audioPlayer.nativeElement;

    if (

      audio.paused ||

      audio.seeking ||

      audio.readyState < HTMLMediaElement.HAVE_METADATA

    ) {

      return;

    }

    // =====================================
    // IMPORTANT FIX
    // =====================================
    //
    // Compare directly with total song time.
    //
    // Example:
    // Intro Skip = 20 seconds
    // Auto Next  = 30 seconds
    //
    // At 00:20 -> continue playing
    // At 00:30 -> play next song
    //
    // Do NOT calculate:
    // 20 + 30 = 50 seconds.

    if (
      audio.currentTime >= this.autoNextDuration
    ) {

      // Prevent duplicate execution.

      this.autoNextTriggered = true;

      // Automatically play next song.

      void this.nextSong();

    }

  }

  // =====================================
  // AUDIO TIME UPDATE
  // =====================================

  onAudioTimeUpdate(): void {

    const audio = this.audioPlayer.nativeElement;

    this.currentTime = audio.currentTime;

    // Check Auto Next on every time update.

    this.checkAutoNext();

  }

  // =====================================
  // SONG ENDED
  // =====================================

  async onSongEnded(): Promise<void> {

    if (this.destroyed) return;

    // Repeat current song.

    if (
      this.repeatMode === 'one' &&
      this.currentSong
    ) {

      await this.playSong(
        this.currentSong
      );

      return;

    }

    // Automatically play next song.

    await this.nextSong();

  }

  // =====================================
  // REPEAT
  // =====================================

  toggleRepeat(): void {

    if (this.repeatMode === 'off') {

      this.repeatMode = 'all';

    } else if (this.repeatMode === 'all') {

      this.repeatMode = 'one';

    } else {

      this.repeatMode = 'off';

    }

  }

  // =====================================
  // AUDIO PLAY EVENT
  // =====================================

  onAudioPlay(): void {

    this.isPlaying = true;

    this.autoplayBlocked = false;

  }

  // =====================================
  // AUDIO PAUSE EVENT
  // =====================================

  onAudioPause(): void {

    this.isPlaying = false;

  }

  // =====================================
  // UPDATE DURATION
  // =====================================

  updateDuration(): void {

    const audio = this.audioPlayer.nativeElement;

    this.duration = Number.isFinite(audio.duration)
      ? audio.duration
      : 0;

  }

  // =====================================
  // SEEK
  // =====================================

  seek(event: Event): void {

    const input = event.target as HTMLInputElement;

    const audio = this.audioPlayer.nativeElement;

    if (!this.duration) return;

    audio.currentTime = Number(input.value);

    this.currentTime = audio.currentTime;

    // Seeking beyond Auto Next position
    // will trigger Auto Next on the next check.

    this.checkAutoNext();

  }

  // =====================================
  // VOLUME
  // =====================================

  changeVolume(event: Event): void {

    const input = event.target as HTMLInputElement;

    this.volume = Number(input.value);

    this.audioPlayer.nativeElement.volume =
      this.volume;

  }

  // =====================================
  // AUDIO ERROR
  // =====================================

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

  // =====================================
  // FORMAT TIME
  // =====================================

  formatTime(seconds: number): string {

    if (!Number.isFinite(seconds)) {

      return '0:00';

    }

    const minutes = Math.floor(seconds / 60);

    const remainingSeconds =
      Math.floor(seconds % 60);

    return `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;

  }

  // =====================================
  // TRACK BY ID
  // =====================================

  trackById(index: number, song: Song): number {

    return song.id;

  }

  // =====================================
  // CLEANUP
  // =====================================

  ngOnDestroy(): void {

    this.destroyed = true;

    this.loadRequestId++;

    if (this.audioPlayer?.nativeElement) {

      const audio = this.audioPlayer.nativeElement;

      audio.pause();

      audio.removeAttribute('src');

      audio.load();

    }

  }

}

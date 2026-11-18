import { FormsModule } from '@angular/forms';
import {
  Component,
  ElementRef,
  ViewChild,
  OnInit,
  OnDestroy,
  AfterViewInit
} from '@angular/core';

interface Song {
  id: number;
  title: string;
  artist: string;
  url: string;
}

@Component({
  selector: 'app-music-player',
  imports: [CommonModule, FormsModule],
  templateUrl: './music-player.component.html',
  styleUrls: ['./music-player.component.css']
})
export class MusicPlayerComponent
  implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('audioPlayer')
  audioPlayer!: ElementRef<HTMLAudioElement>;

  songs: Song[] = [];
  filteredSongs: Song[] = [];

  currentSong: Song | null = null;

  searchText = '';

  isPlaying = false;
  isShuffle = false;

  repeatMode: 'off' | 'all' | 'one' = 'off';

  currentTime = 0;
  duration = 0;
  volume = 0.8;

  skipIntroSeconds = 0;
  autoNextDuration = 0;

  autoplayBlocked = false;
  audioError = false;

  private autoNextTriggered = false;
  private destroyed = false;

  ngOnInit(): void {
    this.loadSongs();
  }

  ngAfterViewInit(): void {
    // Audio element becomes available after view initialization.
  }

  ngOnDestroy(): void {
    this.destroyed = true;

    const audio = this.getAudio();

    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
  }

  // =====================================
  // LOAD SONGS
  // =====================================

  loadSongs(): void {

    // Replace this array with your existing
    // generated music library if you already
    // have one.

    const musicFiles: string[] = [];

    this.songs = musicFiles.map((url, index) => {

      const fileName = decodeURIComponent(
        url.split('/').pop() || ''
      );

      const cleanName = fileName.replace(/\.mp3$/i, '');

      return {
        id: index + 1,
        title: this.cleanSongTitle(cleanName),
        artist: 'Unknown Artist',
        url
      };

    });

    this.filteredSongs = [...this.songs];
  }

  // =====================================
  // CLEAN SONG TITLE
  // =====================================

  cleanSongTitle(title: string): string {

    let cleaned = title;

    // Decode hexadecimal HTML entities
    cleaned = cleaned.replace(
      /&#x([0-9a-f]+);/gi,
      (_, hex) => String.fromCodePoint(parseInt(hex, 16))
    );

    // Decode decimal HTML entities
    cleaned = cleaned.replace(
      /&#(\d+);/g,
      (_, num) => String.fromCodePoint(parseInt(num, 10))
    );

    // Decode common named HTML entities
    const entities: { [key: string]: string } = {
      '&amp;': '&',
      '&quot;': '"',
      '&apos;': "'",
      '&nbsp;': ' ',
      '&lt;': '<',
      '&gt;': '>'
    };

    cleaned = cleaned.replace(
      /&(amp|quot|apos|nbsp|lt|gt);/gi,
      match => entities[match.toLowerCase()] || match
    );

    // Remove audio bitrate labels
    cleaned = cleaned.replace(
      /\(?\s*\d+\s*kbps\s*\)?/gi,
      ''
    );

    // Remove common quality labels
    cleaned = cleaned.replace(
      /\(?\s*(128|192|256|320)\s*k(?:bps)?\s*\)?/gi,
      ''
    );

    // Remove unwanted leading underscores
    cleaned = cleaned.replace(/^[_\s]+/, '');

    // Convert underscores into spaces
    cleaned = cleaned.replace(/_/g, ' ');

    // Clean extra spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  }

  // =====================================
  // SEARCH
  // =====================================

  filterSongs(): void {

    const search = this.searchText.toLowerCase().trim();

    if (!search) {
      this.filteredSongs = [...this.songs];
      return;
    }

    this.filteredSongs = this.songs.filter(song =>
      song.title.toLowerCase().includes(search) ||
      song.artist.toLowerCase().includes(search)
    );
  }

  // =====================================
  // PLAY SONG
  // =====================================

  playSong(song: Song): void {

    if (!song) return;

    this.currentSong = song;
    this.currentTime = 0;
    this.duration = 0;

    this.audioError = false;
    this.autoplayBlocked = false;
    this.autoNextTriggered = false;

    const audio = this.getAudio();

    if (!audio) return;

    audio.src = song.url;
    audio.volume = this.volume;

    audio.load();

    this.playMusic();
  }

  playMusic(): void {

    const audio = this.getAudio();

    if (!audio || !this.currentSong) return;

    audio.play()
      .then(() => {
        this.isPlaying = true;
        this.autoplayBlocked = false;
      })
      .catch(() => {
        this.isPlaying = false;
        this.autoplayBlocked = true;
      });
  }

  togglePlay(): void {

    const audio = this.getAudio();

    if (!audio) return;

    if (audio.paused) {

      if (!this.currentSong && this.songs.length) {
        this.playSong(this.songs[0]);
        return;
      }

      this.playMusic();

    } else {

      audio.pause();
      this.isPlaying = false;

    }
  }

  onAudioPlay(): void {
    this.isPlaying = true;
    this.autoplayBlocked = false;
  }

  onAudioPause(): void {
    this.isPlaying = false;
  }

  // =====================================
  // NEXT / PREVIOUS
  // =====================================

  nextSong(): void {

    if (!this.songs.length) return;

    let nextIndex = 0;

    if (this.currentSong && this.isShuffle) {

      const availableSongs = this.songs.filter(
        song => song.id !== this.currentSong?.id
      );

      if (availableSongs.length) {
        const randomIndex = Math.floor(
          Math.random() * availableSongs.length
        );

        this.playSong(availableSongs[randomIndex]);
        return;
      }
    }

    if (this.currentSong) {

      const currentIndex = this.songs.findIndex(
        song => song.id === this.currentSong?.id
      );

      if (currentIndex < this.songs.length - 1) {
        nextIndex = currentIndex + 1;
      } else if (this.repeatMode === 'all') {
        nextIndex = 0;
      } else {
        this.isPlaying = false;
        return;
      }

    }

    this.playSong(this.songs[nextIndex]);
  }

  previousSong(): void {

    if (!this.songs.length) return;

    const audio = this.getAudio();

    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    const currentIndex = this.songs.findIndex(
      song => song.id === this.currentSong?.id
    );

    const previousIndex =
      currentIndex <= 0
        ? this.songs.length - 1
        : currentIndex - 1;

    this.playSong(this.songs[previousIndex]);
  }

  // =====================================
  // SHUFFLE / REPEAT
  // =====================================

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

  // =====================================
  // AUDIO TIME UPDATE
  // =====================================

  onAudioTimeUpdate(): void {

    const audio = this.getAudio();

    if (!audio) return;

    this.currentTime = audio.currentTime;

    this.applyIntroSkip();
    this.applyAutoNext();
  }

  updateDuration(): void {

    const audio = this.getAudio();

    if (!audio) return;

    this.duration = audio.duration || 0;
  }

  // =====================================
  // SKIP INTRO
  // =====================================

  applyIntroSkip(): void {

    const audio = this.getAudio();

    if (!audio || !this.skipIntroSeconds) return;

    if (
      audio.currentTime < this.skipIntroSeconds &&
      audio.duration > this.skipIntroSeconds
    ) {
      audio.currentTime = this.skipIntroSeconds;
    }
  }

  // =====================================
  // AUTO NEXT
  // =====================================

  applyAutoNext(): void {

    const audio = this.getAudio();

    if (!audio || !this.autoNextDuration) return;

    if (
      audio.currentTime >= this.autoNextDuration &&
      !this.autoNextTriggered
    ) {

      this.autoNextTriggered = true;
      this.nextSong();

    }
  }

  // =====================================
  // SONG ENDED
  // =====================================

  onSongEnded(): void {

    if (this.repeatMode === 'one') {

      const audio = this.getAudio();

      if (audio) {
        audio.currentTime = 0;
        this.playMusic();
      }

      return;
    }

    if (this.repeatMode === 'all' || this.currentSong) {
      this.nextSong();
    }
  }

  // =====================================
  // PROGRESS / SEEK
  // =====================================

  seek(event: Event): void {

    const input = event.target as HTMLInputElement;

    const audio = this.getAudio();

    if (!audio) return;

    audio.currentTime = Number(input.value);

    this.currentTime = audio.currentTime;
  }

  // =====================================
  // VOLUME
  // =====================================

  changeVolume(event: Event): void {

    const input = event.target as HTMLInputElement;

    this.volume = Number(input.value);

    const audio = this.getAudio();

    if (audio) {
      audio.volume = this.volume;
    }
  }

  // =====================================
  // FORMAT TIME
  // =====================================

  formatTime(seconds: number): string {

    if (!Number.isFinite(seconds)) return '0:00';

    const minutes = Math.floor(seconds / 60);

    const remainingSeconds = Math.floor(seconds % 60);

    return `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  }

  // =====================================
  // AUDIO ERROR
  // =====================================

  onAudioError(): void {

    this.isPlaying = false;
    this.audioError = true;

    console.error(
      'Unable to play song:',
      this.currentSong?.title
    );
  }

  // =====================================
  // TRACK BY
  // =====================================

  trackById(index: number, song: Song): number {
    return song.id;
  }

  // =====================================
  // SETTINGS
  // =====================================

  applyIntroSkip(): void {
    // Intro skip is handled by onAudioTimeUpdate().
  }

  applyAutoNext(): void {
    // Auto next is handled by onAudioTimeUpdate().
  }

  // =====================================
  // AUDIO ELEMENT
  // =====================================

  private getAudio(): HTMLAudioElement | null {
    return this.audioPlayer?.nativeElement || null;
  }

}

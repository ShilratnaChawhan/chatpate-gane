
const fs = require('fs');
const path = require('path');

const MUSIC_DIR = path.join(__dirname, 'src/assets/music');
const OUTPUT_DIR = path.join(__dirname, 'src/app/music-player');
const OUTPUT_FILE = path.join(
  OUTPUT_DIR,
  'music-library.generated.ts'
);

function getSongDetails(filename) {
  const name = path.parse(filename).name;
  const parts = name.split(' - ');

  if (parts.length >= 2) {
    return {
      artist: parts[0].trim(),
      title: parts.slice(1).join(' - ').trim()
    };
  }

  return {
    artist: 'Unknown Artist',
    title: name.trim()
  };
}

function scanFolder(folder) {
  let songs = [];

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
    return songs;
  }

  const files = fs.readdirSync(folder, {
    withFileTypes: true
  });

  for (const file of files) {
    const fullPath = path.join(folder, file.name);

    if (file.isDirectory()) {
      songs = songs.concat(scanFolder(fullPath));
      continue;
    }

    if (path.extname(file.name).toLowerCase() !== '.mp3') {
      continue;
    }

    const relativePath = path.relative(
      path.join(__dirname, 'src'),
      fullPath
    );

    const url = relativePath
      .split(path.sep)
      .map(segment => encodeURIComponent(segment))
      .join('/');

    songs.push({
      id: 0,
      ...getSongDetails(file.name),
      url
    });
  }

  return songs;
}

const songs = scanFolder(MUSIC_DIR)
  .sort((a, b) => a.title.localeCompare(b.title))
  .map((song, index) => ({
    ...song,
    id: index + 1
  }));

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const output = `
// Automatically generated. Do not edit manually.

export interface Song {
  id: number;
  title: string;
  artist: string;
  url: string;
}

export const MUSIC_LIBRARY: Song[] =
${JSON.stringify(songs, null, 2)};
`;

fs.writeFileSync(OUTPUT_FILE, output);

console.log(`Music library generated: ${songs.length} songs`);

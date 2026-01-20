export interface PlaylistInfo {
  name: string;
  description: string;
  url: string;
}

export const PLAYLISTS: Record<string, PlaylistInfo> = {
  official: {
    name: "Official Poolsuite FM Playlist",
    description: "The main Poolsuite FM experience",
    url: "https://soundcloud.com/poolsuite/sets/poolsuite-fm-official-playlist",
  },
  official2: {
    name: "Official Poolsuite FM Playlist Two",
    description: "More summer vibes",
    url: "https://soundcloud.com/poolsuite/sets/poolsuite-fm-official-playlist-two",
  },
  mixtapes: {
    name: "Poolsuite Mixtapes",
    description: "Curated mixtape collection",
    url: "https://soundcloud.com/poolsuite/sets/poolsuite-mixtapes",
  },
  balearic: {
    name: "Balearic Sundown",
    description: "Sunset vibes from the Mediterranean",
    url: "https://soundcloud.com/poolsuite/sets/balearic-sundown",
  },
  indie: {
    name: "Indie Summer",
    description: "Indie gems for sunny days",
    url: "https://soundcloud.com/poolsuite/sets/indie-summer",
  },
  tokyo: {
    name: "Tokyo Disco",
    description: "Japanese city pop and disco",
    url: "https://soundcloud.com/poolsuite/sets/tokyo-disco",
  },
  friday: {
    name: "Friday Nite Heat",
    description: "Weekend party energy",
    url: "https://soundcloud.com/poolsuite/sets/friday-nite-heat",
  },
  hangover: {
    name: "Hangover Club",
    description: "Recovery tunes for the morning after",
    url: "https://soundcloud.com/poolsuite/sets/hangover-club",
  },
};

export function getPlaylistNames(): string[] {
  return Object.keys(PLAYLISTS);
}

export function getPlaylist(name: string): PlaylistInfo | undefined {
  return PLAYLISTS[name];
}

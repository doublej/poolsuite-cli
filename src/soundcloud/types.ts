export interface SoundCloudTrack {
  id: number;
  title: string;
  duration: number; // in milliseconds
  user: {
    username: string;
  };
  stream_url?: string;
  artwork_url?: string;
  media?: {
    transcodings: Transcoding[];
  };
}

export interface Transcoding {
  url: string;
  preset: string;
  format: {
    protocol: "hls" | "progressive";
    mime_type: string;
  };
}

export interface SoundCloudPlaylist {
  id: number;
  title: string;
  track_count: number;
  tracks: SoundCloudTrack[];
}

export interface StreamInfo {
  url: string;
  protocol: "hls" | "progressive";
}

export interface ResolvedUrl {
  kind: "playlist" | "track" | "user";
  id: number;
}

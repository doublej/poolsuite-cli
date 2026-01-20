import type { SoundCloudPlaylist, SoundCloudTrack, StreamInfo, Transcoding } from "./types";
import { getClientId, getOAuthToken, type StatusCallback } from "../config";
import { showError } from "../ui";

const API_BASE = "https://api-v2.soundcloud.com";

export class SoundCloudClient {
  private clientId: string;
  private oauthToken?: string;

  constructor(clientId: string, oauthToken?: string) {
    this.clientId = clientId;
    this.oauthToken = oauthToken;
  }

  static async create(onStatus?: StatusCallback): Promise<SoundCloudClient> {
    onStatus?.("Checking credentials");
    const clientId = await getClientId(onStatus);
    const oauthToken = await getOAuthToken();
    return new SoundCloudClient(clientId, oauthToken);
  }

  private buildUrl(path: string, params: Record<string, string> = {}): string {
    const url = new URL(path, API_BASE);
    url.searchParams.set("client_id", this.clientId);
    if (this.oauthToken) {
      url.searchParams.set("oauth_token", this.oauthToken);
    }
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }

  private async fetch<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
    const url = this.buildUrl(path, params);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 401) {
          showError("Authentication failed. The client_id may be invalid or expired.");
          console.log('Run "poolsuite login" to refresh your credentials.\n');
        } else if (response.status === 404) {
          showError("Resource not found.");
        } else {
          showError(`API error: ${response.status} ${response.statusText}`);
        }
        return null;
      }
      return (await response.json()) as T;
    } catch (error) {
      showError(`Network error: ${error instanceof Error ? error.message : "Unknown error"}`);
      return null;
    }
  }

  async resolve(url: string): Promise<SoundCloudPlaylist | SoundCloudTrack | null> {
    return this.fetch<SoundCloudPlaylist | SoundCloudTrack>("/resolve", { url });
  }

  async getPlaylist(playlistId: number): Promise<SoundCloudPlaylist | null> {
    return this.fetch<SoundCloudPlaylist>(`/playlists/${playlistId}`);
  }

  async getPlaylistTracks(playlistId: number): Promise<SoundCloudTrack[]> {
    const playlist = await this.getPlaylist(playlistId);
    if (!playlist) return [];
    return playlist.tracks;
  }

  async getStreamUrl(track: SoundCloudTrack): Promise<StreamInfo | null> {
    const transcodings = track.media?.transcodings;
    if (!transcodings || transcodings.length === 0) {
      return null;
    }

    // Prefer HLS over progressive for better streaming
    const hls = transcodings.find((t) => t.format.protocol === "hls");
    const progressive = transcodings.find((t) => t.format.protocol === "progressive");
    const transcoding = hls || progressive;

    if (!transcoding) return null;

    // The transcoding URL needs to be fetched to get the actual stream URL
    const streamData = await this.fetch<{ url: string }>(transcoding.url.replace(API_BASE, ""));
    if (!streamData) return null;

    return {
      url: streamData.url,
      protocol: transcoding.format.protocol,
    };
  }

  async resolvePlaylistTracks(playlistUrl: string): Promise<SoundCloudTrack[]> {
    const resolved = await this.resolve(playlistUrl);
    if (!resolved) return [];

    if ("tracks" in resolved) {
      return resolved.tracks;
    }

    return [];
  }
}

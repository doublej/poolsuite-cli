import { spawn } from "bun";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import type { SoundCloudTrack } from "./soundcloud/types";
import { SoundCloudClient } from "./soundcloud/client";
import { showError, colorize } from "./ui";
import { createMpvController } from "./mpv-ipc";
import { initUI, updateIntroSteps, switchToPlayer, renderPlayerUI, clearPlayerUI, registerKeyHandler, clearKeyHandlers, type LoadingStep, type StepStatus } from "./player-ui";
import { getPlaylistNames, getPlaylist } from "./playlists";
import { INTRO_MP3_BASE64 } from "./intro-data";

const SEEK_SECONDS = 10;

export async function checkMpvInstalled(): Promise<boolean> {
  try {
    const proc = spawn(["which", "mpv"], { stdout: "pipe", stderr: "pipe" });
    await proc.exited;
    return proc.exitCode === 0;
  } catch {
    return false;
  }
}

export function showMpvInstallInstructions(): void {
  showError("mpv is not installed");
  console.log();
  console.log(colorize("Install mpv:", "yellow"));
  console.log("  macOS:       brew install mpv");
  console.log("  Arch Linux:  sudo pacman -S mpv");
  console.log("  Ubuntu:      sudo apt install mpv");
  console.log("  Fedora:      sudo dnf install mpv");
  console.log();
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

type PlayResult = "quit" | "end" | { switchTo: string };

async function playTracks(
  client: SoundCloudClient,
  tracks: SoundCloudTrack[],
  shouldShuffle: boolean,
  playlistKey: string,
  allPlaylistKeys: string[],
  mpv: ReturnType<typeof createMpvController>,
  onKey: (cb: (key: string) => void) => void
): Promise<PlayResult> {
  if (tracks.length === 0) return "end";

  const playOrder = shouldShuffle ? shuffle(tracks) : tracks;
  let currentIndex = 0;
  let shouldQuit = false;
  let skipToNext = false;
  let skipToPrev = false;
  let switchToPlaylist: string | null = null;
  let position = 0;
  let duration = 0;
  let isPaused = false;
  let updateInterval: ReturnType<typeof setInterval> | null = null;

  const updateUI = async () => {
    isPaused = await mpv.isPaused().catch(() => false);
    await renderPlayerUI({
      track: playOrder[currentIndex],
      trackIndex: currentIndex + 1,
      totalTracks: playOrder.length,
      position, duration, isPaused, playlistKey, allPlaylistKeys,
    });
  };

  onKey(async (key: string) => {
    if (key === "left" || key === ",") await mpv.seek(-SEEK_SECONDS).catch(() => {});
    else if (key === "right" || key === ".") await mpv.seek(SEEK_SECONDS).catch(() => {});
    else if (key === "space") { await mpv.togglePause().catch(() => {}); await updateUI(); }
    else if (key === "n" || key === ">") { skipToNext = true; await mpv.quit().catch(() => {}); }
    else if (key === "p" || key === "<") { skipToPrev = true; await mpv.quit().catch(() => {}); }
    else if (key === "q" || key === "escape") { shouldQuit = true; await mpv.quit().catch(() => {}); }
    else if (key === "tab") {
      const nextIdx = (allPlaylistKeys.indexOf(playlistKey) + 1) % allPlaylistKeys.length;
      switchToPlaylist = allPlaylistKeys[nextIdx];
      await mpv.quit().catch(() => {});
    }
  });

  while (currentIndex < playOrder.length && !shouldQuit && !switchToPlaylist) {
    const track = playOrder[currentIndex];
    skipToNext = false;
    skipToPrev = false;
    position = 0;
    duration = track.duration / 1000;

    const streamInfo = await client.getStreamUrl(track);
    if (!streamInfo) { currentIndex++; continue; }

    try { await mpv.play(streamInfo.url); }
    catch { currentIndex++; continue; }

    mpv.onTimeChange((pos, dur) => { position = pos; if (dur > 0) duration = dur; });

    await updateUI();
    updateInterval = setInterval(updateUI, 500);
    await mpv.waitForEnd();

    if (updateInterval) { clearInterval(updateInterval); updateInterval = null; }
    if (switchToPlaylist) break;

    if (skipToPrev && currentIndex > 0) currentIndex--;
    else if (!skipToPrev) currentIndex++;
  }

  if (updateInterval) clearInterval(updateInterval);
  if (shouldQuit) return "quit";
  if (switchToPlaylist) return { switchTo: switchToPlaylist };
  return "end";
}

export async function startPlayer(
  initialPlaylistKey: string,
  shouldShuffle: boolean
): Promise<void> {
  const allPlaylistKeys = getPlaylistNames();
  const mpv = createMpvController();

  // Define loading steps (dynamically populated)
  const steps: LoadingStep[] = [
    { label: "Loading config", status: "pending" },
  ];

  // Initialize single ink UI instance
  initUI(steps);

  let client: SoundCloudClient;

  // Write embedded intro to temp file
  const introPath = `/tmp/poolsuite-intro-${process.pid}.mp3`;
  writeFileSync(introPath, Buffer.from(INTRO_MP3_BASE64, "base64"));

  // Play intro audio in parallel with initialization
  const introPromise = mpv.play(introPath).then(() => mpv.waitForEnd()).catch(() => {}).finally(() => {
    if (existsSync(introPath)) unlinkSync(introPath);
  });

  // Create client with dynamic status updates
  client = await SoundCloudClient.create((stepLabel) => {
    // Mark current active step as done
    for (const s of steps) {
      if (s.status === "active") s.status = "done";
    }
    // Add step if not exists, then set active
    let step = steps.find(s => s.label === stepLabel);
    if (!step) {
      step = { label: stepLabel, status: "pending" };
      steps.push(step);
    }
    step.status = "active";
    updateIntroSteps(steps);
  });

  // Mark all active steps as done
  for (const s of steps) {
    if (s.status === "active") s.status = "done";
  }

  // Add and activate resolving playlist step
  steps.push({ label: "Resolving playlist", status: "active" });
  updateIntroSteps(steps);

  // Wait for intro to finish
  await introPromise;

  // Mark resolving as done
  const resolveStep = steps.find(s => s.label === "Resolving playlist");
  if (resolveStep) resolveStep.status = "done";
  updateIntroSteps(steps);

  let currentPlaylistKey = initialPlaylistKey;

  // Switch to player mode
  switchToPlayer({
    allPlaylistKeys,
    playlistKey: currentPlaylistKey,
    track: null,
    trackIndex: 0,
    totalTracks: 0,
    position: 0,
    duration: 0,
    isPaused: false,
    loadingMessage: "Resolving playlist...",
  });

  // Handle Ctrl+C
  process.on("SIGINT", () => { clearPlayerUI(); process.exit(0); });

  while (true) {
    const playlist = getPlaylist(currentPlaylistKey);
    if (!playlist) break;

    // Show loading state immediately before fetching tracks
    await renderPlayerUI({
      allPlaylistKeys,
      playlistKey: currentPlaylistKey,
      track: null,
      trackIndex: 0,
      totalTracks: 0,
      position: 0,
      duration: 0,
      isPaused: false,
      loadingMessage: "Resolving playlist...",
    });

    clearKeyHandlers();
    const tracks = await client!.resolvePlaylistTracks(playlist.url);
    const result = await playTracks(client!, tracks, shouldShuffle, currentPlaylistKey, allPlaylistKeys, mpv, registerKeyHandler);

    if (result === "quit" || result === "end") break;
    if (typeof result === "object") currentPlaylistKey = result.switchTo;
  }

  clearPlayerUI();
  console.log(colorize("Playback stopped.", "cyan"));
  process.exit(0);
}

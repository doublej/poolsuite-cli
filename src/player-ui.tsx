import React, { useState, useEffect, useRef } from "react";
import { render, Box, Text, useInput } from "ink";
import type { SoundCloudTrack } from "./soundcloud/types";
import { formatTime } from "./progress";

const VERSION = "2.1.2";

const LOGO = [
  "                 _         _ _",
  " _ __  ___  ___ | |___ _  _(_) |_ ___",
  "| '_ \\/ _ \\/ _ \\| (_-<| || | |  _/ -_)",
  "| .__/\\___/\\___/|_/__/ \\_,_|_|\\__\\___|",
  "|_|                              cli",
];

// Types
export type StepStatus = "pending" | "active" | "done";
export interface LoadingStep { label: string; status: StepStatus; }
export type StepCallback = (label: string, status: StepStatus) => void;

interface PlayerState {
  track?: SoundCloudTrack | null;
  trackIndex: number;
  totalTracks: number;
  position: number;
  duration: number;
  isPaused: boolean;
  playlistKey: string;
  allPlaylistKeys: string[];
  loadingMessage?: string;
}

type AppMode = "intro" | "player";

interface AppState {
  mode: AppMode;
  steps: LoadingStep[];
  playerState: PlayerState | null;
}

// Global state and handlers
let inkInstance: ReturnType<typeof render> | null = null;
let globalSetAppState: ((state: Partial<AppState>) => void) | null = null;
const globalKeyHandlers: ((key: string) => void)[] = [];

// Intro Screen Component
function IntroScreen({ steps }: { steps: LoadingStep[] }) {
  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1}>
        {LOGO.map((line, i) => (
          <Text key={i} color="cyan">{line}</Text>
        ))}
        <Text> </Text>
        <Text color="blue">soundcloud fork ({VERSION})</Text>
        <Text> </Text>
        <Box flexDirection="column">
          {steps.map((step, i) => {
            const icon = step.status === "done" ? "✓" : step.status === "active" ? "◐" : "○";
            const color = step.status === "done" ? "green" : step.status === "active" ? "yellow" : "blue";
            const label = step.status === "active" ? `${step.label}...` : step.label;
            return (
              <Text key={i} color={color}>{icon}  {label}</Text>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

// Player Screen Component
function PlayerScreen({ state }: { state: PlayerState }) {
  const { allPlaylistKeys, playlistKey, track, trackIndex, totalTracks, position, duration, isPaused, loadingMessage } = state;

  // Tabs
  const tabs = allPlaylistKeys.map((key, idx) => {
    const label = key.length > 8 ? key.slice(0, 7) + "." : key;
    const isActive = key === playlistKey;
    return (
      <Text key={`tab-${idx}`} color={isActive ? "cyan" : "blue"} bold={isActive}>
        {isActive ? `[${label}]` : ` ${label} `}
      </Text>
    );
  });

  // Loading state
  if (loadingMessage || !track) {
    return (
      <Box flexDirection="column" alignItems="center" paddingY={1}>
        <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1}>
          <Box justifyContent="center">{tabs}</Box>
          <Text> </Text>
          <Text color="yellow">{loadingMessage || "Loading..."}</Text>
        </Box>
      </Box>
    );
  }

  // Track info
  const trackText = `${track.user.username} - ${track.title}`;
  const displayTrack = trackText.length > 60 ? trackText.slice(0, 57) + "..." : trackText;

  // Progress bar
  const barWidth = 40;
  const filled = Math.floor((duration > 0 ? position / duration : 0) * barWidth);
  const progressBar = "█".repeat(filled) + "░".repeat(barWidth - filled);

  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1}>
        <Box justifyContent="center">{tabs}</Box>
        <Text> </Text>
        <Text color="yellow">{displayTrack}</Text>
        <Text color="blue">[ {trackIndex} / {totalTracks} ]</Text>
        <Text> </Text>
        <Text>
          <Text color="cyan">{progressBar}</Text>
          <Text>  {formatTime(position)} / {formatTime(duration)} </Text>
          <Text color={isPaused ? "yellow" : "green"}>{isPaused ? "││" : "▶"}</Text>
        </Text>
        <Text> </Text>
        <Text color="blue">[Space] Play  [&lt;/&gt;] Seek  [n/p] Track  [Tab] Playlist  [q] Quit</Text>
      </Box>
    </Box>
  );
}

// Main App - single instance that handles both modes
function App({ initialState }: { initialState: AppState }) {
  const [state, setState] = useState(initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Handle input at App level so it works in all modes
  useInput((input, key) => {
    let k: string | null = null;
    if (input === "q" || key.escape) k = "q";
    else if (key.leftArrow || input === ",") k = "left";
    else if (key.rightArrow || input === ".") k = "right";
    else if (input === " ") k = "space";
    else if (input === "n" || input === ">") k = "n";
    else if (input === "p" || input === "<") k = "p";
    else if (key.tab) k = "tab";

    if (k && globalKeyHandlers.length > 0) {
      globalKeyHandlers.forEach(h => h(k!));
    }
  });

  useEffect(() => {
    globalSetAppState = (partial: Partial<AppState>) => {
      setState(prev => ({ ...prev, ...partial }));
    };
    return () => {
      globalSetAppState = null;
    };
  }, []);

  if (state.mode === "intro") {
    return <IntroScreen steps={state.steps} />;
  }

  if (state.playerState) {
    return <PlayerScreen state={state.playerState} />;
  }

  return <Text>Loading...</Text>;
}

// Public API
export function initUI(steps: LoadingStep[]): void {
  // Explicitly enable raw mode for keyboard input
  if (process.stdin.isTTY && process.stdin.setRawMode) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
  }

  inkInstance = render(
    <App initialState={{ mode: "intro", steps, playerState: null }} />
  );
}

export function updateIntroSteps(steps: LoadingStep[]): void {
  globalSetAppState?.({ steps: [...steps] });
}

export function switchToPlayer(playerState: PlayerState): void {
  globalSetAppState?.({ mode: "player", playerState });
}

export async function renderPlayerUI(state: PlayerState): Promise<void> {
  globalSetAppState?.({ playerState: state });
}

export function registerKeyHandler(handler: (key: string) => void): void {
  globalKeyHandlers.push(handler);
}

export function clearKeyHandlers(): void {
  globalKeyHandlers.length = 0;
}

export function clearPlayerUI(): void {
  if (inkInstance) {
    inkInstance.unmount();
    inkInstance = null;
  }
  // Restore terminal to cooked mode
  if (process.stdin.isTTY && process.stdin.setRawMode) {
    process.stdin.setRawMode(false);
  }
}

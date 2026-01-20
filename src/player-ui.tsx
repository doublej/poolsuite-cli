import React, { useState, useEffect } from "react";
import { render, Box, Text, useInput, useApp, useStdin } from "ink";
import type { SoundCloudTrack } from "./soundcloud/types";
import { formatTime } from "./progress";

const VERSION = "1.1.0";

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

// Ink instance reference
let inkInstance: ReturnType<typeof render> | null = null;
let currentKeyHandler: ((key: string) => void) | null = null;

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
function PlayerScreen({ state, onKey }: { state: PlayerState; onKey: (key: string) => void }) {
  const { allPlaylistKeys, playlistKey, track, trackIndex, totalTracks, position, duration, isPaused, loadingMessage } = state;
  const { isRawModeSupported } = useStdin();

  useInput((input, key) => {
    if (key.leftArrow || input === ",") onKey("left");
    else if (key.rightArrow || input === ".") onKey("right");
    else if (input === " ") onKey("space");
    else if (input === "n" || input === ">") onKey("n");
    else if (input === "p" || input === "<") onKey("p");
    else if (input === "q" || key.escape) onKey("q");
    else if (key.tab) onKey("tab");
  }, { isActive: isRawModeSupported });

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

// Main App wrapper for player
function App({ initialState, keyHandler }: { initialState: PlayerState; keyHandler: (key: string) => void }) {
  const [state, setState] = useState(initialState);
  const { exit } = useApp();

  // Expose setState globally
  useEffect(() => {
    (globalThis as any).__inkSetState = setState;
    (globalThis as any).__inkExit = exit;
    return () => {
      delete (globalThis as any).__inkSetState;
      delete (globalThis as any).__inkExit;
    };
  }, [exit]);

  return <PlayerScreen state={state} onKey={keyHandler} />;
}

// Public API
export function initInkUI(): void {
  // Ink will be initialized when needed
}

export async function showIntroScreen(
  steps: LoadingStep[],
  onComplete: (setStep: StepCallback) => Promise<void>
): Promise<void> {
  let rerender: () => void;

  const setStep: StepCallback = (label: string, status: StepStatus) => {
    const step = steps.find(s => s.label === label);
    if (step) step.status = status;
    rerender?.();
  };

  // Render intro
  const { rerender: r, unmount, clear } = render(
    <IntroScreen steps={steps} />,
    { exitOnCtrlC: false }
  );
  rerender = () => r(<IntroScreen steps={steps} />);

  await onComplete(setStep);
  clear();
  unmount();
}

export async function renderPlayerUI(state: PlayerState): Promise<void> {
  const setState = (globalThis as any).__inkSetState;
  if (setState) {
    setState(state);
  }
}

// Global key handlers that playback.ts can register to
const globalKeyHandlers: ((key: string) => void)[] = [];

export function registerKeyHandler(handler: (key: string) => void): void {
  globalKeyHandlers.push(handler);
}

export function clearKeyHandlers(): void {
  globalKeyHandlers.length = 0;
}

export function startPlayerUI(initialState: PlayerState): void {
  const handleKey = (key: string) => {
    globalKeyHandlers.forEach(h => h(key));
  };

  inkInstance = render(
    <App initialState={initialState} keyHandler={handleKey} />,
    { exitOnCtrlC: false }
  );
}

export function clearPlayerUI(): void {
  if (inkInstance) {
    inkInstance.unmount();
    inkInstance = null;
  }
}

export function exitApp(): void {
  const exit = (globalThis as any).__inkExit;
  if (exit) exit();
}

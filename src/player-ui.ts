import blessed from "blessed";
import type { SoundCloudTrack } from "./soundcloud/types";
import { formatTime } from "./progress";

const VERSION = "1.1.0";
const CONTENT_WIDTH = 72;

const LOADING_PHRASES = [
  "sunshine", "palm trees", "cocktails", "sunset vibes",
  "poolside beats", "summer breeze", "disco balls", "tan lines", "good times",
];

const LOGO = [
  "                 _         _ _",
  " _ __  ___  ___ | |___ _  _(_) |_ ___",
  "| '_ \\/ _ \\/ _ \\| (_-<| || | |  _/ -_)",
  "| .__/\\___/\\___/|_/__/ \\_,_|_|\\__\\___|",
  "|_|                              cli",
];

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

export type StepStatus = "pending" | "active" | "done";
export interface LoadingStep { label: string; status: StepStatus; }

function renderLoadingSteps(steps: LoadingStep[], width: number): string[] {
  return steps.map(({ label, status }) => {
    const icon = status === "done" ? "{green-fg}✓{/}"
               : status === "active" ? "{yellow-fg}◐{/}"
               : "{blue-fg}○{/}";
    const text = status === "active" ? `{yellow-fg}${label}...{/}`
               : status === "done" ? `{green-fg}${label}{/}`
               : `{blue-fg}${label}{/}`;
    return boxLine(`${icon}  ${text}`, width);
  });
}

let screen: blessed.Widgets.Screen | null = null;
let mainBox: blessed.Widgets.BoxElement | null = null;

// Helper: create a bordered line with centered content
function boxLine(content: string, width: number, color = "cyan-fg"): string {
  const clean = content.replace(/\{[^}]+\}/g, "");
  const pad = Math.floor((width - clean.length) / 2);
  const rightPad = width - pad - clean.length;
  return `{${color}}│{/}${" ".repeat(pad)}${content}${" ".repeat(rightPad)}{${color}}│{/}`;
}

function emptyLine(width: number): string {
  return `{cyan-fg}│{/}${" ".repeat(width)}{cyan-fg}│{/}`;
}

export function initBlessedUI(): blessed.Widgets.Screen {
  screen = blessed.screen({ smartCSR: true, title: "Poolsuite FM" });
  mainBox = blessed.box({
    parent: screen, top: 0, left: 0, width: "100%", height: "100%", tags: true,
  });
  screen.render();
  return screen;
}

export type StepCallback = (label: string, status: StepStatus) => void;

export async function showIntroScreen(
  steps: LoadingStep[],
  onComplete: (setStep: StepCallback) => Promise<void>
): Promise<void> {
  if (!screen || !mainBox) return;

  const width = 50;
  let tick = 0;

  const setStep: StepCallback = (label: string, status: StepStatus) => {
    const step = steps.find(s => s.label === label);
    if (step) step.status = status;
    render();
  };

  const render = () => {
    tick++;
    const lines = [
      "",
      `{cyan-fg}┌${"─".repeat(width)}┐{/}`,
      ...LOGO.map(l => boxLine(`{cyan-fg}${l}{/}`, width)),
      emptyLine(width),
      boxLine(`{blue-fg}soundcloud fork (${VERSION}){/}`, width),
      emptyLine(width),
      `{cyan-fg}├${"─".repeat(width)}┤{/}`,
      emptyLine(width),
      ...renderLoadingSteps(steps, width),
      emptyLine(width),
      `{cyan-fg}└${"─".repeat(width)}┘{/}`,
    ];

    mainBox!.setContent(lines.join("\n"));
    screen!.render();
  };

  render();
  const interval = setInterval(render, 300);
  await onComplete(setStep);
  clearInterval(interval);
}

function renderTabbedUI(state: PlayerState): string {
  const { allPlaylistKeys, playlistKey, track, trackIndex, totalTracks, position, duration, isPaused, loadingMessage } = state;

  // Tabs
  const tabLine = allPlaylistKeys.map(key => {
    const label = (key.length > 8 ? key.slice(0, 7) + "." : key).padStart(Math.floor((8 + key.length) / 2)).padEnd(8);
    return key === playlistKey ? `{cyan-fg}{bold}[${label}]{/}` : `{blue-fg} ${label} {/}`;
  }).join("");

  const tabsWidth = allPlaylistKeys.length * 10;
  const leftPad = Math.max(0, Math.floor((CONTENT_WIDTH - tabsWidth) / 2));

  // Loading state: show tabs + loading message
  if (loadingMessage || !track) {
    const message = loadingMessage || "Loading...";
    return [
      "",
      `{cyan-fg}┌${"─".repeat(CONTENT_WIDTH)}┐{/}`,
      `{cyan-fg}│{/}${" ".repeat(leftPad)}${tabLine}${" ".repeat(Math.max(0, CONTENT_WIDTH - leftPad - tabsWidth))}{cyan-fg}│{/}`,
      `{cyan-fg}├${"─".repeat(CONTENT_WIDTH)}┤{/}`,
      emptyLine(CONTENT_WIDTH),
      boxLine(`{yellow-fg}${message}{/}`, CONTENT_WIDTH),
      emptyLine(CONTENT_WIDTH),
      `{cyan-fg}└${"─".repeat(CONTENT_WIDTH)}┘{/}`,
    ].join("\n");
  }

  // Track text (truncate if needed)
  const trackText = `${track.user.username} - ${track.title}`;
  const displayTrack = trackText.length > CONTENT_WIDTH - 4 ? trackText.slice(0, CONTENT_WIDTH - 7) + "..." : trackText;

  // Progress bar
  const barWidth = 40;
  const filled = Math.floor((duration > 0 ? position / duration : 0) * barWidth);
  const progressContent = `{cyan-fg}${"█".repeat(filled)}{/}{blue-fg}${"░".repeat(barWidth - filled)}{/}  ${formatTime(position)} / ${formatTime(duration)} ${isPaused ? "{yellow-fg}││{/}" : "{green-fg}▶{/}"}`;

  const controls = "[Space] Play  [</>] Seek  [n/p] Track  [Tab] Playlist  [q] Quit";

  return [
    "",
    `{cyan-fg}┌${"─".repeat(CONTENT_WIDTH)}┐{/}`,
    `{cyan-fg}│{/}${" ".repeat(leftPad)}${tabLine}${" ".repeat(Math.max(0, CONTENT_WIDTH - leftPad - tabsWidth))}{cyan-fg}│{/}`,
    `{cyan-fg}├${"─".repeat(CONTENT_WIDTH)}┤{/}`,
    boxLine(`{yellow-fg}${displayTrack}{/}`, CONTENT_WIDTH),
    boxLine(`{blue-fg}[ ${trackIndex} / ${totalTracks} ]{/}`, CONTENT_WIDTH),
    emptyLine(CONTENT_WIDTH),
    boxLine(progressContent, CONTENT_WIDTH),
    emptyLine(CONTENT_WIDTH),
    boxLine(`{blue-fg}${controls}{/}`, CONTENT_WIDTH),
    `{cyan-fg}└${"─".repeat(CONTENT_WIDTH)}┘{/}`,
  ].join("\n");
}

export async function renderPlayerUI(state: PlayerState): Promise<void> {
  if (!screen || !mainBox) return;
  mainBox.setContent(renderTabbedUI(state));
  screen.render();
}

export function clearPlayerUI(): void {
  if (screen) {
    // Suppress blessed terminfo errors on cleanup
    const origErr = console.error;
    console.error = () => {};
    try { screen.destroy(); } catch {}
    console.error = origErr;
    screen = null;
    mainBox = null;
  }
}

export function getScreen(): blessed.Widgets.Screen | null {
  return screen;
}

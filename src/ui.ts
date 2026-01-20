const VERSION = "2.0.0";

// ANSI color codes
export const colors = {
  cyan: "\x1b[0;36m",
  yellow: "\x1b[1;33m",
  green: "\x1b[0;32m",
  red: "\x1b[0;31m",
  blue: "\x1b[0;34m",
  reset: "\x1b[0m",
} as const;

export function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

export function showBanner(): void {
  console.log(colorize(
    `
    ____              __          _ __
   / __ \\____  ____  / /______  __(_) /____
  / /_/ / __ \\/ __ \\/ / ___/ / / / / __/ _ \\
 / ____/ /_/ / /_/ / (__  ) /_/ / / /_/  __/
/_/    \\____/\\____/_/____/\\__,_/_/\\__/\\___/
                                    CLI v${VERSION}`,
    "cyan"
  ));
  console.log();
  console.log(colorize("Ultra-summer internet radio from the command line", "blue"));
  console.log();
}

export function showError(message: string): void {
  console.error(colorize(`Error: ${message}`, "red"));
}

export function showSuccess(message: string): void {
  console.log(colorize(message, "green"));
}

export function showInfo(label: string, value: string): void {
  console.log(`${colorize(label + ":", "green")} ${colorize(value, "yellow")}`);
}

export function showPlaybackStart(): void {
  console.log();
  console.log(colorize("♪♫ Starting playback... ♫♪", "cyan"));
  console.log();
}

export function getVersion(): string {
  return VERSION;
}

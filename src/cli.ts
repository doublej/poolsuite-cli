import { showBanner, showError, colorize, getVersion } from "./ui";
import { PLAYLISTS, getPlaylist } from "./playlists";
import { loginAndSaveCredentials } from "./soundcloud/browser";
import { checkMpvInstalled, showMpvInstallInstructions, startPlayer } from "./playback";

interface ParsedArgs {
  command: string;
  playlist?: string;
  shuffle: boolean;
  help: boolean;
  version: boolean;
  list: boolean;
}

export function parseArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = {
    command: "",
    shuffle: false,
    help: false,
    version: false,
    list: false,
  };

  for (const arg of args) {
    switch (arg) {
      case "-h":
      case "--help":
        result.help = true;
        break;
      case "-v":
      case "--version":
        result.version = true;
        break;
      case "-l":
      case "--list":
        result.list = true;
        break;
      case "-s":
      case "--shuffle":
        result.shuffle = true;
        break;
      case "login":
        result.command = "login";
        break;
      default:
        if (!arg.startsWith("-") && !result.playlist && !result.command) {
          result.playlist = arg;
        }
        break;
    }
  }

  return result;
}

export function showHelp(): void {
  showBanner();
  console.log(colorize("Usage:", "green"));
  console.log(`  poolsuite ${colorize("[playlist]", "yellow")} ${colorize("[options]", "yellow")}`);
  console.log();
  console.log(colorize("Playlists:", "green"));
  for (const [key, info] of Object.entries(PLAYLISTS)) {
    console.log(`  ${colorize(key.padEnd(12), "yellow")} ${info.description}`);
  }
  console.log();
  console.log(colorize("Commands:", "green"));
  console.log(`  ${colorize("login", "yellow")}           Log in to SoundCloud (opens browser)`);
  console.log();
  console.log(colorize("Options:", "green"));
  console.log(`  ${colorize("-l, --list", "yellow")}      List all available playlists`);
  console.log(`  ${colorize("-s, --shuffle", "yellow")}   Shuffle playlist`);
  console.log(`  ${colorize("-h, --help", "yellow")}      Show this help message`);
  console.log(`  ${colorize("-v, --version", "yellow")}   Show version`);
  console.log();
  console.log(colorize("Examples:", "green"));
  console.log("  poolsuite              # Play default playlist");
  console.log("  poolsuite tokyo        # Play Tokyo Disco");
  console.log("  poolsuite friday -s    # Play Friday Nite Heat shuffled");
  console.log("  poolsuite login        # Log in to SoundCloud");
  console.log();
  console.log(colorize("Note:", "blue") + " This is an unofficial tool. All music curation credit");
  console.log(`      goes to Poolsuite FM. Support them at ${colorize("https://poolsuite.net", "cyan")}`);
  console.log();
}

export function showVersion(): void {
  console.log(`poolsuite v${getVersion()}`);
}

export function listPlaylists(): void {
  showBanner();
  console.log(colorize("Available Playlists:", "green"));
  console.log();
  for (const [key, info] of Object.entries(PLAYLISTS)) {
    console.log(`  ${colorize(key.padEnd(12), "yellow")} ${info.name}`);
  }
  console.log();
}

export async function runLoginCommand(): Promise<void> {
  showBanner();
  const success = await loginAndSaveCredentials();
  if (!success) {
    process.exit(1);
  }
}

export async function runPlayCommand(playlistName: string, shuffle: boolean): Promise<void> {
  // Check mpv first
  if (!(await checkMpvInstalled())) {
    showMpvInstallInstructions();
    process.exit(1);
  }

  // Validate playlist
  const playlist = getPlaylist(playlistName);
  if (!playlist) {
    showError(`Unknown playlist '${playlistName}'`);
    console.log(`Run ${colorize("poolsuite --list", "yellow")} to see available playlists`);
    process.exit(1);
  }

  await startPlayer(playlistName, shuffle);
}

export async function run(args: string[]): Promise<void> {
  const parsed = parseArgs(args);

  if (parsed.version) {
    showVersion();
    return;
  }

  if (parsed.help) {
    showHelp();
    return;
  }

  if (parsed.list) {
    listPlaylists();
    return;
  }

  if (parsed.command === "login") {
    await runLoginCommand();
    return;
  }

  // Default to playing
  const playlistName = parsed.playlist || "official";
  await runPlayCommand(playlistName, parsed.shuffle);
}

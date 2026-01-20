# Poolsuite CLI 🏖️

> Ultra-summer internet radio from your terminal

An **unofficial** command-line player for [Poolsuite FM](https://poolsuite.net/)'s curated playlists. Stream their amazing music selections directly from your terminal!

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Demo

```bash
$ poolsuite tokyo

    ____              __          _ __
   / __ \____  ____  / /______  __(_) /____
  / /_/ / __ \/ __ \/ / ___/ / / / / __/ _ \
 / ____/ /_/ / /_/ / (__  ) /_/ / / /_/  __/
/_/    \____/\____/_/____/\__,_/_/\__/\___/
                                    CLI v2.0.0

Ultra-summer internet radio from the command line

Now Playing: Tokyo Disco
Playlist: tokyo

♪♫ Starting playback... ♫♪

[1/50] Tatsuro Yamashita - Sparkle
```

## Features

- 🎵 **8 Curated Playlists** - Official FM, Tokyo Disco, Indie Summer, and more
- 🔀 **Shuffle Support** - Random playback for variety
- ⚡ **Works Out of the Box** - No configuration required
- 🔐 **Optional Login** - Log in for private playlists
- 🎹 **Full Playback Controls** - Play, pause, skip via mpv

## Installation

### Prerequisites

**1. Bun runtime**
```bash
curl -fsSL https://bun.sh/install | bash
```

**2. mpv media player**
```bash
# macOS
brew install mpv

# Ubuntu/Debian
sudo apt install mpv

# Arch Linux
sudo pacman -S mpv
```

### Install

```bash
git clone https://github.com/jamespember/poolsuite-cli.git
cd poolsuite-cli
bun install
```

### Run

```bash
# Play immediately (no setup needed!)
bun run src/index.ts

# Or build a standalone binary
bun run build
./poolsuite
```

## Usage

### Quick Start

```bash
# Play the default official playlist
poolsuite

# Play a specific playlist
poolsuite tokyo

# Shuffle mode
poolsuite friday -s

# List all playlists
poolsuite --list
```

### Available Playlists

| Command | Description |
|---------|-------------|
| `official` | Official Poolsuite FM Playlist *(default)* |
| `official2` | Official Poolsuite FM Playlist Two |
| `mixtapes` | Poolsuite Mixtapes Collection |
| `balearic` | Balearic Sundown - Sunset vibes |
| `indie` | Indie Summer - Indie gems |
| `tokyo` | Tokyo Disco - Japanese city pop |
| `friday` | Friday Nite Heat - Weekend energy |
| `hangover` | Hangover Club - Recovery tunes |

### Optional: Log In to SoundCloud

The CLI works without login, but you can log in to access private playlists:

```bash
poolsuite login
```

This opens a browser window where you enter your SoundCloud credentials. The CLI automatically extracts and saves the necessary tokens.

### Playback Controls (mpv)

| Key | Action |
|-----|--------|
| `Space` | Play/Pause |
| `9` / `0` | Volume down/up |
| `m` | Mute/Unmute |
| `>` | Next track |
| `<` | Previous track |
| `q` | Quit |

### All Options

```bash
poolsuite [playlist] [options]

Commands:
  login           Log in to SoundCloud (opens browser)

Options:
  -l, --list      List all available playlists
  -s, --shuffle   Shuffle playlist
  -h, --help      Show help message
  -v, --version   Show version
```

## Development

```bash
# Run in development mode
bun run dev

# Type check
bun run typecheck

# Build standalone binary
bun run build
```

## Troubleshooting

### "mpv is not installed"
```bash
brew install mpv      # macOS
sudo apt install mpv  # Ubuntu
```

### "Authentication failed"
Run `poolsuite login` to refresh credentials.

## Credits

**All music curation credit goes to [Poolsuite FM](https://poolsuite.net/)**

This is an unofficial tool. Please support the original:
- 🌐 [poolsuite.net](https://poolsuite.net/)
- 🎧 [SoundCloud](https://soundcloud.com/poolsuite)

**Built with:** [Bun](https://bun.sh/) · [Puppeteer](https://pptr.dev/) · [mpv](https://mpv.io/)

## License

MIT

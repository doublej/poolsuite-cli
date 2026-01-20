# Poolsuite CLI

Fork of [jamespember/poolsuite-cli](https://github.com/jamespember/poolsuite-cli) with the following changes:

## What's Different

- **Rewritten in TypeScript/Bun** - Originally a bash script
- **TUI with tabbed playlists** - Switch between playlists with Tab key
- **Loading progress UI** - Shows initialization steps as they complete
- **Integrated controls** - Seek, pause, skip without leaving the app

## Install

```bash
# Prerequisites: bun, mpv
bun install
bun run dev
```

## Usage

```bash
bun run dev [playlist] [-s]
```

Controls: `Space` pause, `</>` seek, `n/p` track, `Tab` playlist, `q` quit

## Auth

Works without login. On first run, extracts API keys via headless browser.

Optional SoundCloud login for private playlists:
```bash
bun run dev login
```

## Credits

All music curation: [Poolsuite FM](https://poolsuite.net/)

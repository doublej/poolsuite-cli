#!/usr/bin/env bun

/**
 * Poolsuite FM CLI Player
 *
 * An unofficial command-line player for Poolsuite FM's curated playlists.
 * All music curation credit goes to Poolsuite FM (https://poolsuite.net/)
 *
 * Support the original: https://poolsuite.net/
 */

import { run } from "./cli";

// Skip first two args (bun and script path)
const args = process.argv.slice(2);

run(args).catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});

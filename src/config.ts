import { homedir } from "os";
import { join } from "path";

export interface Config {
  client_id?: string;
  oauth_token?: string;
}

const CONFIG_DIR = join(homedir(), ".poolsuite");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export async function ensureConfigDir(): Promise<void> {
  const fs = await import("fs/promises");
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch {
    // Directory exists
  }
}

export async function loadConfig(): Promise<Config> {
  const fs = await import("fs/promises");
  try {
    const data = await fs.readFile(CONFIG_FILE, "utf-8");
    return JSON.parse(data) as Config;
  } catch {
    return {};
  }
}

export async function saveConfig(config: Config): Promise<void> {
  const fs = await import("fs/promises");
  await ensureConfigDir();
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export type StatusCallback = (step: string) => void;

export async function getClientId(onStatus?: StatusCallback): Promise<string> {
  onStatus?.("Loading config");
  const config = await loadConfig();
  if (config.client_id) return config.client_id;

  const { extractClientIdHeadless } = await import("./soundcloud/browser");
  const clientId = await extractClientIdHeadless(onStatus);

  if (!clientId) {
    throw new Error("Could not extract client_id from SoundCloud");
  }

  onStatus?.("Saving config");
  await saveConfig({ ...config, client_id: clientId });
  return clientId;
}

export async function clearClientId(): Promise<void> {
  const config = await loadConfig();
  delete config.client_id;
  await saveConfig(config);
}

export async function getOAuthToken(): Promise<string | undefined> {
  const config = await loadConfig();
  return config.oauth_token;
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

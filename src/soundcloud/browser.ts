import puppeteer, { type Browser, type Page } from "puppeteer";
import { saveConfig, type Config } from "../config";
import { showSuccess, showError, colorize } from "../ui";

interface ExtractedCredentials {
  client_id: string;
  oauth_token?: string;
}

const BROWSER_ARGS = ["--no-sandbox", "--disable-setuid-sandbox"];

function extractClientIdFromScripts(): string | null {
  const scripts = Array.from(document.querySelectorAll("script"));
  for (const script of scripts) {
    const match = script.textContent?.match(/client_id['":\s]+['"]([a-zA-Z0-9]+)['"]/);
    if (match) return match[1];
  }
  return null;
}

async function setupClientIdInterceptor(page: Page): Promise<() => string | null> {
  let capturedClientId: string | null = null;

  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const match = request.url().match(/client_id=([a-zA-Z0-9]+)/);
    if (match && !capturedClientId) capturedClientId = match[1];
    request.continue();
  });

  return () => capturedClientId;
}

export type BrowserStatusCallback = (step: string) => void;

export async function extractClientIdHeadless(onStatus?: BrowserStatusCallback): Promise<string | null> {
  let browser: Browser | null = null;

  try {
    onStatus?.("Launching browser");
    browser = await puppeteer.launch({ headless: true, args: BROWSER_ARGS });
    const page = await browser.newPage();
    const getClientId = await setupClientIdInterceptor(page);

    onStatus?.("Connecting to SoundCloud");
    await page.goto("https://soundcloud.com", { waitUntil: "networkidle2", timeout: 30000 });

    onStatus?.("Extracting API keys");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const clientId = getClientId() ?? await page.evaluate(extractClientIdFromScripts);
    await browser.close();
    return clientId;
  } catch {
    if (browser) await browser.close();
    return null;
  }
}

async function extractOAuthToken(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const keys = ["oauth_token", "V2::local::oauth_token", "soundcloud_oauth_token"];
    for (const key of keys) {
      const value = localStorage.getItem(key);
      if (value) return value;
    }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.toLowerCase().includes("oauth")) return localStorage.getItem(key);
    }
    return null;
  });
}

async function clickSignInButton(page: Page): Promise<void> {
  try {
    await page.waitForSelector('button[aria-label="Sign in"]', { timeout: 5000 });
    await page.click('button[aria-label="Sign in"]');
  } catch {
    for (const btn of await page.$$("button")) {
      if ((await btn.evaluate((el) => el.textContent))?.includes("Sign in")) {
        await btn.click();
        break;
      }
    }
  }
}

export async function extractCredentialsWithBrowser(): Promise<ExtractedCredentials | null> {
  console.log(colorize("\nStarting SoundCloud login...", "cyan"));
  console.log("A browser window will open. Please log in to SoundCloud.\n");

  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1200, height: 800 },
      args: BROWSER_ARGS,
    });

    const page = await browser.newPage();
    const getClientId = await setupClientIdInterceptor(page);

    await page.goto("https://soundcloud.com", { waitUntil: "networkidle2" });

    console.log(colorize("Please log in using the browser window...", "yellow"));
    await clickSignInButton(page);

    console.log(colorize("Waiting for login to complete...", "blue"));
    await page.waitForFunction(
      () => document.querySelector('[aria-label="Your account"]') ||
            document.querySelector('.headerUser') ||
            document.querySelector('[href="/you/library"]'),
      { timeout: 120000 }
    );

    console.log(colorize("Login detected! Extracting credentials...", "green"));
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const oauthToken = await extractOAuthToken(page);
    const clientId = getClientId() ?? await page.evaluate(extractClientIdFromScripts);

    await browser.close();

    if (!clientId) {
      showError("Could not extract client_id");
      return null;
    }

    return { client_id: clientId, oauth_token: oauthToken ?? undefined };
  } catch (error) {
    if (browser) await browser.close();
    const msg = error instanceof Error ? error.message : "Unknown error";
    showError(msg.includes("timeout") ? "Login timed out. Please try again." : `Browser automation failed: ${msg}`);
    return null;
  }
}

export async function loginAndSaveCredentials(): Promise<boolean> {
  const credentials = await extractCredentialsWithBrowser();

  if (!credentials) {
    return false;
  }

  const config: Config = {
    client_id: credentials.client_id,
    ...(credentials.oauth_token && { oauth_token: credentials.oauth_token }),
  };

  await saveConfig(config);

  console.log();
  showSuccess("Credentials saved successfully!");
  console.log(`  client_id: ${colorize(credentials.client_id.slice(0, 8) + "...", "yellow")}`);
  if (credentials.oauth_token) {
    console.log(`  oauth_token: ${colorize("(saved)", "yellow")}`);
  }
  console.log(`\nConfig saved to: ${colorize("~/.poolsuite/config.json", "cyan")}`);
  console.log();

  return true;
}

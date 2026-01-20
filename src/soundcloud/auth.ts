import { getOAuthToken } from "../config";

/**
 * Check if the user has logged in with OAuth.
 * Note: The app works without login using an auto-extracted client_id,
 * but login provides access to private playlists and better rate limits.
 */
export async function hasCustomCredentials(): Promise<boolean> {
  const token = await getOAuthToken();
  return !!token;
}

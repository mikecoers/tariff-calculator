/**
 * Spotify Authorization Code with PKCE.
 *
 * Flow:
 *   1) generate code_verifier + code_challenge, store verifier
 *   2) redirect to accounts.spotify.com/authorize?... with challenge
 *   3) on redirect back with ?code, exchange for access_token at /api/token
 *   4) persist tokens; refresh as needed
 *
 * Scopes required for Web Playback SDK + search:
 *   streaming, user-read-email, user-read-private, user-modify-playback-state,
 *   user-read-playback-state
 */

const LS_PREFIX = 'djmix.spotify';
const LS_CLIENT_ID = `${LS_PREFIX}.clientId`;
const LS_VERIFIER = `${LS_PREFIX}.verifier`;
const LS_TOKEN = `${LS_PREFIX}.token`;

export interface SpotifyToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number; // ms epoch
  refresh_token?: string;
  scope?: string;
}

export const SPOTIFY_SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-modify-playback-state',
  'user-read-playback-state',
].join(' ');

export function getClientId(): string | null {
  return localStorage.getItem(LS_CLIENT_ID);
}
export function setClientId(id: string) {
  localStorage.setItem(LS_CLIENT_ID, id.trim());
}
export function clearClientId() {
  localStorage.removeItem(LS_CLIENT_ID);
}

export function getStoredToken(): SpotifyToken | null {
  const raw = localStorage.getItem(LS_TOKEN);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SpotifyToken;
  } catch {
    return null;
  }
}
export function storeToken(tok: SpotifyToken) {
  localStorage.setItem(LS_TOKEN, JSON.stringify(tok));
}
export function clearToken() {
  localStorage.removeItem(LS_TOKEN);
}

function base64url(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomString(len = 64): string {
  const a = new Uint8Array(len);
  crypto.getRandomValues(a);
  return base64url(a);
}

async function sha256(s: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hash);
}

export function getRedirectUri(): string {
  // Must exactly match one entry in the Spotify dashboard's Redirect URIs.
  return `${window.location.origin}${window.location.pathname}`;
}

export async function startAuth(clientId: string): Promise<void> {
  const verifier = randomString(64);
  const challenge = base64url(await sha256(verifier));
  localStorage.setItem(LS_VERIFIER, verifier);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: getRedirectUri(),
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SPOTIFY_SCOPES,
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function completeAuthFromUrl(): Promise<SpotifyToken | null> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  if (error) {
    // Clean error off URL
    url.searchParams.delete('error');
    history.replaceState({}, '', url.toString());
    throw new Error(`Spotify auth error: ${error}`);
  }
  if (!code) return null;

  const clientId = getClientId();
  const verifier = localStorage.getItem(LS_VERIFIER);
  if (!clientId || !verifier) {
    return null;
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getRedirectUri(),
    client_id: clientId,
    code_verifier: verifier,
  });
  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  // Clean the code off the URL either way
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  history.replaceState({}, '', url.toString());

  if (!resp.ok) {
    throw new Error(`Spotify token exchange failed: ${resp.status}`);
  }
  const data = (await resp.json()) as {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    scope?: string;
  };
  const tok: SpotifyToken = {
    ...data,
    expires_at: Date.now() + (data.expires_in - 30) * 1000,
  };
  storeToken(tok);
  localStorage.removeItem(LS_VERIFIER);
  return tok;
}

export async function refreshAccessToken(): Promise<SpotifyToken | null> {
  const tok = getStoredToken();
  const clientId = getClientId();
  if (!tok?.refresh_token || !clientId) return null;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: tok.refresh_token,
    client_id: clientId,
  });
  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!resp.ok) {
    clearToken();
    return null;
  }
  const data = (await resp.json()) as {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    scope?: string;
  };
  const next: SpotifyToken = {
    access_token: data.access_token,
    token_type: data.token_type,
    expires_in: data.expires_in,
    expires_at: Date.now() + (data.expires_in - 30) * 1000,
    refresh_token: data.refresh_token || tok.refresh_token,
    scope: data.scope || tok.scope,
  };
  storeToken(next);
  return next;
}

export async function getValidAccessToken(): Promise<string | null> {
  const tok = getStoredToken();
  if (!tok) return null;
  if (Date.now() >= tok.expires_at) {
    const refreshed = await refreshAccessToken();
    return refreshed?.access_token ?? null;
  }
  return tok.access_token;
}

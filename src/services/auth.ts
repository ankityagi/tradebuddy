// Google OAuth Authentication Service

export interface AuthState {
  isSignedIn: boolean;
  user: GoogleUser | null;
  accessToken: string | null;
}

export interface GoogleUser {
  email: string;
  name: string;
  picture: string;
}

const AUTH_STORAGE_KEY = 'tradebuddy_auth';
const SHEET_URL_KEY = 'tradebuddy_sheet_url';

// Store auth state in localStorage
export function saveAuthState(state: Partial<AuthState>): void {
  const current = getAuthState();
  const updated = { ...current, ...state };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
}

// Retrieve auth state from localStorage
export function getAuthState(): AuthState {
  const stored = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) {
    return { isSignedIn: false, user: null, accessToken: null };
  }
  try {
    return JSON.parse(stored);
  } catch {
    return { isSignedIn: false, user: null, accessToken: null };
  }
}

// Clear auth state (sign out)
export function clearAuthState(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

// Store connected sheet URL
export function saveSheetUrl(url: string): void {
  localStorage.setItem(SHEET_URL_KEY, url);
}

// Get connected sheet URL
export function getSheetUrl(): string | null {
  return localStorage.getItem(SHEET_URL_KEY);
}

// Clear sheet URL
export function clearSheetUrl(): void {
  localStorage.removeItem(SHEET_URL_KEY);
}

// Extract spreadsheet ID from Google Sheets URL
export function extractSpreadsheetId(url: string): string | null {
  // Matches: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

// Validate that URL is a Google Sheets URL
export function isValidSheetUrl(url: string): boolean {
  return url.includes('docs.google.com/spreadsheets/d/');
}

// Decode JWT to get user info from Google credential
export function decodeGoogleCredential(credential: string): GoogleUser | null {
  try {
    const payload = credential.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return {
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
    };
  } catch {
    return null;
  }
}

// App configuration
// Replace with your Google Cloud OAuth Client ID

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Scopes required for Google Sheets access
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

// Check if Google OAuth is configured
export function isGoogleConfigured(): boolean {
  return GOOGLE_CLIENT_ID.length > 0;
}

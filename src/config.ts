// App configuration
// Replace with your Google Cloud OAuth Client ID

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Scopes required for Google Sheets access
// Using drive.file instead of spreadsheets for minimal permissions:
// - Only accesses files user explicitly creates/opens via the app
// - Cannot access other files in user's Drive
// - Usually doesn't require Google verification
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

// Check if Google OAuth is configured
export function isGoogleConfigured(): boolean {
  return GOOGLE_CLIENT_ID.length > 0;
}

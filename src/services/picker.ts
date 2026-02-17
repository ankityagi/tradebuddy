// Google Picker API service
// Allows users to select files from their Google Drive
// Selected files get drive.file scope access

import { GOOGLE_CLIENT_ID } from '../config';

// Google Picker API types
declare global {
  interface Window {
    google: {
      picker: {
        PickerBuilder: new () => PickerBuilder;
        ViewId: {
          SPREADSHEETS: string;
        };
        Action: {
          PICKED: string;
          CANCEL: string;
        };
        DocsView: new (viewId: string) => DocsView;
      };
    };
    gapi: {
      load: (api: string, callback: () => void) => void;
    };
  }
}

interface PickerBuilder {
  addView(view: DocsView): PickerBuilder;
  setOAuthToken(token: string): PickerBuilder;
  setDeveloperKey(key: string): PickerBuilder;
  setCallback(callback: (data: PickerResponse) => void): PickerBuilder;
  setTitle(title: string): PickerBuilder;
  setSelectableMimeTypes(mimeTypes: string): PickerBuilder;
  build(): Picker;
}

interface DocsView {
  setIncludeFolders(include: boolean): DocsView;
  setMimeTypes(mimeTypes: string): DocsView;
}

interface Picker {
  setVisible(visible: boolean): void;
}

interface PickerResponse {
  action: string;
  docs?: PickerDocument[];
}

interface PickerDocument {
  id: string;
  name: string;
  url: string;
  mimeType: string;
}

let pickerApiLoaded = false;

/**
 * Load the Google Picker API script
 */
export function loadPickerApi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (pickerApiLoaded) {
      resolve();
      return;
    }

    // Check if gapi is already loaded
    if (window.gapi) {
      window.gapi.load('picker', () => {
        pickerApiLoaded = true;
        resolve();
      });
      return;
    }

    // Load gapi script
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      window.gapi.load('picker', () => {
        pickerApiLoaded = true;
        resolve();
      });
    };
    script.onerror = () => reject(new Error('Failed to load Google Picker API'));
    document.body.appendChild(script);
  });
}

/**
 * Open Google Picker to select a spreadsheet
 */
export function openSpreadsheetPicker(
  accessToken: string,
  onSelect: (spreadsheetId: string, spreadsheetUrl: string, name: string) => void,
  onCancel?: () => void
): void {
  if (!window.google?.picker) {
    throw new Error('Google Picker API not loaded. Call loadPickerApi() first.');
  }

  const view = new window.google.picker.DocsView(window.google.picker.ViewId.SPREADSHEETS)
    .setIncludeFolders(true)
    .setMimeTypes('application/vnd.google-apps.spreadsheet');

  const picker = new window.google.picker.PickerBuilder()
    .addView(view)
    .setOAuthToken(accessToken)
    .setTitle('Select a spreadsheet for TradeBuddy')
    .setCallback((data: PickerResponse) => {
      if (data.action === window.google.picker.Action.PICKED && data.docs?.[0]) {
        const doc = data.docs[0];
        const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${doc.id}/edit`;
        onSelect(doc.id, spreadsheetUrl, doc.name);
      } else if (data.action === window.google.picker.Action.CANCEL) {
        onCancel?.();
      }
    })
    .build();

  picker.setVisible(true);
}

/**
 * Create a new spreadsheet via Google Sheets API
 */
export async function createNewSpreadsheet(
  accessToken: string,
  title: string = 'TradeBuddy Trades'
): Promise<{ id: string; url: string }> {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: 'Summary',
            index: 0,
          },
        },
        {
          properties: {
            title: 'Template',
            index: 1,
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create spreadsheet');
  }

  const data = await response.json();
  return {
    id: data.spreadsheetId,
    url: `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
  };
}

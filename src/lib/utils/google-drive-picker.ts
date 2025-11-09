// Google Drive Picker API integration
// Handles file picking and downloading from Google Drive

declare const gapi: any;
declare const google: any;

interface GoogleDriveConfig {
  api_key?: string;
  client_id?: string;
}

let API_KEY = '';
let CLIENT_ID = '';
const SCOPE = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
];

let pickerApiLoaded = false;
let oauthToken: string | null = null;
let initialized = false;

// Fetch credentials from backend config
async function getCredentials(): Promise<void> {
  const response = await fetch('/api/config');
  if (!response.ok) {
    throw new Error('Failed to fetch Google Drive credentials');
  }
  const config = await response.json();
  const driveConfig: GoogleDriveConfig = config.google_drive || {};
  
  API_KEY = driveConfig.api_key || '';
  CLIENT_ID = driveConfig.client_id || '';

  if (!API_KEY || !CLIENT_ID) {
    throw new Error('Google Drive API credentials not configured');
  }
}

// Validate required credentials
const validateCredentials = () => {
  if (!API_KEY || !CLIENT_ID || API_KEY === '' || CLIENT_ID === '') {
    throw new Error('Please configure valid Google Drive API credentials');
  }
};

// Load Google Drive API
export const loadGoogleDriveApi = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    if (typeof gapi !== 'undefined') {
      gapi.load('picker', () => {
        pickerApiLoaded = true;
        resolve(true);
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      gapi.load('picker', () => {
        pickerApiLoaded = true;
        resolve(true);
      });
    };
    script.onerror = reject;
    document.body.appendChild(script);
  });
};

// Load Google Auth API
export const loadGoogleAuthApi = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    if (typeof google !== 'undefined') {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => resolve(true);
    script.onerror = reject;
    document.body.appendChild(script);
  });
};

// Get OAuth access token
export const getAuthToken = async (): Promise<string> => {
  if (oauthToken) {
    return oauthToken;
  }

  return new Promise((resolve, reject) => {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE.join(' '),
      callback: (response: any) => {
        if (response.access_token) {
          oauthToken = response.access_token;
          resolve(oauthToken);
        } else {
          reject(new Error('Failed to get access token'));
        }
      },
      error_callback: (error: any) => {
        reject(new Error(error.message || 'OAuth error occurred'));
      },
    });
    tokenClient.requestAccessToken();
  });
};

// Initialize Google Drive Picker
const initialize = async (): Promise<void> => {
  if (!initialized) {
    await getCredentials();
    validateCredentials();
    await Promise.all([loadGoogleDriveApi(), loadGoogleAuthApi()]);
    initialized = true;
  }
};

interface PickerResult {
  id: string;
  name: string;
  url: string;
  blob: Blob;
  headers: Record<string, string>;
}

// Create and display Google Drive Picker
export const createPicker = (): Promise<PickerResult | null> => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('Initializing Google Drive Picker...');
      await initialize();
      
      console.log('Getting auth token...');
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Unable to get OAuth token');
      }
      console.log('Auth token obtained successfully');

      const picker = new google.picker.PickerBuilder()
        .enableFeature(google.picker.Feature.NAV_HIDDEN)
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
        .addView(
          new google.picker.DocsView()
            .setIncludeFolders(false)
            .setSelectFolderEnabled(false)
            .setMimeTypes(
              'application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.google-apps.document,application/vnd.google-apps.spreadsheet,application/vnd.google-apps.presentation'
            )
        )
        .setOAuthToken(token)
        .setDeveloperKey(API_KEY)
        .setCallback(async (data: any) => {
          if (data[google.picker.Response.ACTION] === google.picker.Action.PICKED) {
            try {
              const doc = data[google.picker.Response.DOCUMENTS][0];
              const fileId = doc[google.picker.Document.ID];
              const fileName = doc[google.picker.Document.NAME];
              const mimeType = doc[google.picker.Document.MIME_TYPE];

              if (!fileId || !fileName) {
                throw new Error('Required file details missing');
              }

              // Construct download URL based on MIME type
              let downloadUrl: string;
              let exportFormat: string;

              if (mimeType.includes('google-apps')) {
                // Handle Google Workspace files
                if (mimeType.includes('document')) {
                  exportFormat = 'text/plain';
                } else if (mimeType.includes('spreadsheet')) {
                  exportFormat = 'text/csv';
                } else if (mimeType.includes('presentation')) {
                  exportFormat = 'text/plain';
                } else {
                  exportFormat = 'application/pdf';
                }
                downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportFormat)}`;
              } else {
                // Regular files
                downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
              }

              // Download file
              const response = await fetch(downloadUrl, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  Accept: '*/*',
                },
              });

              if (!response.ok) {
                const errorText = await response.text();
                console.error('Download failed:', {
                  status: response.status,
                  statusText: response.statusText,
                  error: errorText,
                });
                throw new Error(`Failed to download file (${response.status}): ${errorText}`);
              }

              const blob = await response.blob();
              const result: PickerResult = {
                id: fileId,
                name: fileName,
                url: downloadUrl,
                blob: blob,
                headers: {
                  Authorization: `Bearer ${token}`,
                  Accept: '*/*',
                },
              };
              resolve(result);
            } catch (error) {
              reject(error);
            }
          } else if (data[google.picker.Response.ACTION] === google.picker.Action.CANCEL) {
            resolve(null);
          }
        })
        .build();

      picker.setVisible(true);
    } catch (error) {
      console.error('Google Drive Picker error:', error);
      reject(error);
    }
  });
};


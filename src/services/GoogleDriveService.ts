import { db } from '../db';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];

export interface DriveFileInfo {
  id: string;
  name: string;
  modifiedTime: string;
}

console.log('GoogleDriveService: CLIENT_ID detected:', CLIENT_ID ? 'YES' : 'MISSING');

class GoogleDriveService {
  private gapi: any = null;
  private tokenClient: any = null;
  private accessToken: string | null = null;

  async init() {
    console.log('GoogleDriveService: Initializing libraries...');
    return new Promise<void>((resolve, reject) => {
      if (this.gapi && this.tokenClient) {
        console.log('GoogleDriveService: Already initialized');
        return resolve();
      }

      // 1. Load Google API Client (GAPI)
      const loadGapi = () => {
        return new Promise<void>((res, rej) => {
          const GAPI_SCRIPT_ID = 'gapi-js';
          if (document.getElementById(GAPI_SCRIPT_ID)) {
            if ((window as any).gapi) res();
            else {
              const existing = document.getElementById(GAPI_SCRIPT_ID);
              existing!.onload = () => res();
            }
            return;
          }

          const script = document.createElement('script');
          script.id = GAPI_SCRIPT_ID;
          script.src = 'https://apis.google.com/js/api.js';
          script.onload = () => {
            (window as any).gapi.load('client', async () => {
              try {
                await (window as any).gapi.client.init({
                  discoveryDocs: DISCOVERY_DOCS,
                });
                this.gapi = (window as any).gapi;
                console.log('GoogleDriveService: GAPI client initialized');
                res();
              } catch (err) {
                rej(err);
              }
            });
          };
          script.onerror = rej;
          document.head.appendChild(script);
        });
      };

      // 2. Load Google Identity Services (GIS)
      const loadGis = () => {
        return new Promise<void>((res, rej) => {
          const GIS_SCRIPT_ID = 'gis-js';
          if (document.getElementById(GIS_SCRIPT_ID)) {
            if ((window as any).google?.accounts?.oauth2) {
              this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: '',
              });
              res();
            } else {
              const existing = document.getElementById(GIS_SCRIPT_ID);
              existing!.onload = () => res(); // Simplified, might need careful handling
            }
            return;
          }

          const script = document.createElement('script');
          script.id = GIS_SCRIPT_ID;
          script.src = 'https://accounts.google.com/gsi/client';
          script.onload = () => {
            console.log('GoogleDriveService: GIS script loaded');
            this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
              client_id: CLIENT_ID,
              scope: SCOPES,
              callback: '', 
            });
            res();
          };
          script.onerror = rej;
          document.head.appendChild(script);
        });
      };

      Promise.all([loadGapi(), loadGis()])
        .then(() => {
          console.log('GoogleDriveService: All libraries initialized');
          resolve();
        })
        .catch(err => {
          console.error('GoogleDriveService: Initialization failed:', err);
          reject(err);
        });
    });
  }

  async signIn() {
    await this.init();
    
    return new Promise<any>((resolve, reject) => {
      try {
        this.tokenClient.callback = async (response: any) => {
          if (response.error !== undefined) {
            reject(response);
            return;
          }
          this.accessToken = response.access_token;
          
          // Fetch user info using the token
          const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${this.accessToken}` }
          });
          const userInfo = await userInfoResponse.json();

          const userData = {
            id: userInfo.sub,
            name: userInfo.name,
            email: userInfo.email,
            avatarUrl: userInfo.picture,
            settings: {
              useCloudSync: true,
              language: 'en',
              units: 'kg' as 'kg' | 'lbs'
            }
          };

          await db.profiles.put(userData);
          resolve(userData);
        };

        // requestToken triggers the popup
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      } catch (err) {
        reject(err);
      }
    });
  }

  async signOut() {
    if (this.accessToken) {
      (window as any).google.accounts.oauth2.revoke(this.accessToken, () => {
        console.log('GoogleDriveService: Access token revoked');
      });
      this.accessToken = null;
    }
  }

  private async ensureAuthorized() {
    if (!this.accessToken) {
      await this.signIn();
    }
    // Set token for gapi client
    (window as any).gapi.client.setToken({ access_token: this.accessToken });
  }

  async uploadBackup() {
    await this.init();
    await this.ensureAuthorized();

    const backupData = {
      exercises: await db.exercises.toArray(),
      templates: await db.templates.toArray(),
      sessions: await db.sessions.toArray(),
      profiles: await db.profiles.toArray(),
      exportDate: Date.now()
    };

    const fileName = `aura_backup_${Date.now()}.json`;
    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const metadata = {
      name: fileName,
      mimeType: 'application/json',
      parents: ['appDataFolder']
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(backupData) +
      close_delim;

    return this.gapi.client.request({
      path: '/upload/drive/v3/files',
      method: 'POST',
      params: { uploadType: 'multipart' },
      headers: {
        'Content-Type': 'multipart/related; boundary="' + boundary + '"'
      },
      body: multipartRequestBody
    });
  }

  async findLatestBackup(): Promise<DriveFileInfo | null> {
    await this.init();
    // We don't necessarily want to trigger a sign-in popup just to check for a backup
    // unless the user is already signed in.
    if (!this.accessToken) return null;

    (window as any).gapi.client.setToken({ access_token: this.accessToken });
    
    const response = await this.gapi.client.drive.files.list({
      spaces: 'appDataFolder',
      fields: 'files(id, name, modifiedTime)',
      orderBy: 'modifiedTime desc',
      pageSize: 1
    });

    const files = response.result.files;
    return files && files.length > 0 ? files[0] : null;
  }

  async downloadBackup(fileId: string) {
    await this.init();
    await this.ensureAuthorized();

    const response = await this.gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media'
    });
    return response.result;
  }
}

export const googleDriveService = new GoogleDriveService();

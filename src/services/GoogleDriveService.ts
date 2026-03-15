import { db } from '../db';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];

export interface DriveFileInfo {
  id: string;
  name: string;
  modifiedTime: string;
}

class GoogleDriveService {
  private gapi: any = null;

  async init() {
    return new Promise<void>((resolve, reject) => {
      if (this.gapi) return resolve();

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        (window as any).gapi.load('client:auth2', async () => {
          try {
            await (window as any).gapi.client.init({
              clientId: CLIENT_ID,
              discoveryDocs: DISCOVERY_DOCS,
              scope: SCOPES,
            });
            this.gapi = (window as any).gapi;
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async signIn() {
    await this.init();
    const authInstance = this.gapi.auth2.getAuthInstance();
    const user = await authInstance.signIn();
    const profile = user.getBasicProfile();

    const userData = {
      id: profile.getId(),
      name: profile.getName(),
      email: profile.getEmail(),
      avatarUrl: profile.getImageUrl(),
      settings: {
        useCloudSync: true,
        language: 'en',
        units: 'kg' as 'kg' | 'lbs'
      }
    };

    // Save to local profile
    await db.profiles.put(userData);
    return userData;
  }

  async signOut() {
    if (!this.gapi) await this.init();
    await this.gapi.auth2.getAuthInstance().signOut();
  }

  async uploadBackup() {
    if (!this.gapi || !this.gapi.auth2.getAuthInstance().isSignedIn.get()) {
      throw new Error('Not signed in to Google Drive');
    }

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
    if (!this.gapi) await this.init();
    
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
    const response = await this.gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media'
    });
    return response.result;
  }
}

export const googleDriveService = new GoogleDriveService();

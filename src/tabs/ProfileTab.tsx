import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { googleDriveService, DriveFileInfo } from '../services/GoogleDriveService';
import { 
  User, 
  Settings, 
  Cloud, 
  RefreshCw, 
  LogOut, 
  Shield, 
  Database,
  CheckCircle2,
  AlertCircle,
  History
} from 'lucide-react';

export default function ProfileTab() {
  const profile = useLiveQuery(() => db.profiles.toCollection().first());
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastBackup, setLastBackup] = useState<DriveFileInfo | null>(null);

  useEffect(() => {
    // Pre-load Google scripts
    googleDriveService.init().catch(err => {
      console.error('Failed to pre-load Google scripts:', err);
    });

    if (profile) {
      checkLastBackup();
    }
  }, [profile]);

  const checkLastBackup = async () => {
    try {
      const latest = await googleDriveService.findLatestBackup();
      setLastBackup(latest);
    } catch (err) {
      console.error('Failed to check latest backup:', err);
    }
  };

  const handleSignIn = async () => {
    try {
      setError(null);
      await googleDriveService.signIn();
    } catch (err: any) {
      setError(err.error || 'Failed to sign in');
    }
  };

  const handleSignOut = async () => {
    try {
      await googleDriveService.signOut();
      await db.profiles.clear();
      setLastBackup(null);
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  const handleSyncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setError(null);
    try {
      await googleDriveService.uploadBackup();
      await db.profiles.update(profile!.id, { lastSync: Date.now() });
      await checkLastBackup();
    } catch (err: any) {
      setError(err.message || 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-white p-6 pb-24 overflow-y-auto">
      <h1 className="text-3xl font-bold mb-8">Profile</h1>

      {/* User Card */}
      <div className="bg-apple-card border border-white/5 rounded-3xl p-6 mb-8 shadow-xl">
        {profile ? (
          <div className="flex items-center gap-4">
            {profile.avatarUrl ? (
              <img 
                src={profile.avatarUrl} 
                alt={profile.name} 
                className="w-16 h-16 rounded-full border-2 border-apple-accent/20"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-apple-accent/10 flex items-center justify-center">
                <User size={32} className="text-apple-accent" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{profile.name}</h2>
              <p className="text-apple-text-muted text-sm">{profile.email}</p>
            </div>
            <button 
              onClick={handleSignOut}
              className="p-2 text-apple-text-muted hover:text-red-400 transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <User size={32} className="text-white/20" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Not Signed In</h2>
            <p className="text-apple-text-muted text-sm mb-6">
              Connect your Google account to back up your workout history and routines.
            </p>
            <button 
              onClick={handleSignIn}
              className="w-full bg-white text-black font-semibold py-3 px-6 rounded-2xl flex items-center justify-center gap-3 hover:bg-white/90 transition-all active:scale-95"
            >
              <Cloud size={20} />
              Sign in with Google
            </button>
          </div>
        )}
      </div>

      {/* Cloud Sync Status */}
      {profile && (
        <div className="space-y-4 mb-8">
          <h3 className="text-sm font-medium text-apple-text-muted uppercase tracking-wider ml-2">
            Cloud Sync
          </h3>
          <div className="bg-apple-card border border-white/5 rounded-3xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isSyncing ? 'bg-apple-accent/10' : 'bg-green-500/10'}`}>
                  {isSyncing ? (
                    <RefreshCw size={20} className="text-apple-accent animate-spin" />
                  ) : (
                    <CheckCircle2 size={20} className="text-green-500" />
                  )}
                </div>
                <div>
                  <p className="font-medium">Automatic Backup</p>
                  <p className="text-xs text-apple-text-muted">
                    {profile.lastSync 
                      ? `Last synced ${new Date(profile.lastSync).toLocaleString()}` 
                      : 'Never synced'}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="bg-apple-accent/10 text-apple-accent px-4 py-2 rounded-xl text-sm font-medium hover:bg-apple-accent/20 transition-colors disabled:opacity-50"
              >
                Sync Now
              </button>
            </div>

            {lastBackup && (
              <div className="flex items-center gap-3 text-xs text-apple-text-muted pt-4 border-t border-white/5">
                <History size={14} />
                <span>Backup found in Google Drive: {new Date(lastBackup.modifiedTime).toLocaleDateString()}</span>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 text-red-400 text-sm">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Data Management */}
      <h3 className="text-sm font-medium text-apple-text-muted uppercase tracking-wider ml-2 mb-4">
        Data Management
      </h3>
      <div className="bg-apple-card border border-white/5 rounded-3xl overflow-hidden shadow-lg">
        <button className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors border-b border-white/5 text-left">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <Database size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="font-medium">Export Data (JSON)</p>
              <p className="text-xs text-apple-text-muted">Download your entire local database.</p>
            </div>
          </div>
        </button>
        <button className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors text-left">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-xl">
              <Shield size={20} className="text-purple-500" />
            </div>
            <div>
              <p className="font-medium">Privacy Settings</p>
              <p className="text-xs text-apple-text-muted">Manage app permissions and tracking.</p>
            </div>
          </div>
        </button>
      </div>

      <p className="text-center text-apple-text-muted text-xs mt-12 mb-8">
        Aura Fitness v1.2.0 • Created with ❤️
      </p>
    </div>
  );
}

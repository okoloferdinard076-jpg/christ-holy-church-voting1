import React, { useState, useEffect } from 'react';
import {
  getActiveFirebaseConfig,
  saveCustomFirebaseConfig,
  hasCustomFirebaseConfig,
  testFirestoreConnection,
  FirebaseConfig,
  syncCandidateToFirestore,
} from '../../services/firebase';
import { Candidate } from '../../types';
import {
  Cloud,
  CheckCircle2,
  AlertCircle,
  Key,
  Database,
  RefreshCw,
  Copy,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowUpRight,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';

interface FirebaseConfigManagerProps {
  candidates: Candidate[];
  onRefresh: () => void;
}

export const FirebaseConfigManager: React.FC<FirebaseConfigManagerProps> = ({
  candidates,
  onRefresh,
}) => {
  const [config, setConfig] = useState<FirebaseConfig>(getActiveFirebaseConfig());
  const [rawJson, setRawJson] = useState<string>('');
  const [useJsonMode, setUseJsonMode] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isCustom = hasCustomFirebaseConfig();

  useEffect(() => {
    const current = getActiveFirebaseConfig();
    setConfig(current);
    setRawJson(JSON.stringify(current, null, 2));
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testFirestoreConnection(config);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      let finalConfig: FirebaseConfig = config;
      if (useJsonMode) {
        finalConfig = JSON.parse(rawJson);
      }

      if (!finalConfig.projectId || !finalConfig.apiKey) {
        throw new Error('Project ID and API Key are required.');
      }

      saveCustomFirebaseConfig(finalConfig);
      setConfig(finalConfig);
      setRawJson(JSON.stringify(finalConfig, null, 2));
      setFeedback({
        type: 'success',
        text: 'Firebase cloud configuration saved! Cross-device sync is active.',
      });
      onRefresh();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to save Firebase configuration',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreDefaults = () => {
    saveCustomFirebaseConfig(null);
    const def = getActiveFirebaseConfig();
    setConfig(def);
    setRawJson(JSON.stringify(def, null, 2));
    setFeedback({
      type: 'success',
      text: 'Restored provisioned Firebase configuration defaults.',
    });
    setTestResult(null);
    onRefresh();
  };

  const handleSyncAllCandidatesToCloud = async () => {
    if (candidates.length === 0) {
      setFeedback({ type: 'error', text: 'No candidates available to sync.' });
      return;
    }
    setIsSyncingAll(true);
    setFeedback(null);
    try {
      for (const cand of candidates) {
        await syncCandidateToFirestore(cand);
      }
      setFeedback({
        type: 'success',
        text: `Successfully synced ${candidates.length} contestant(s) to Firestore Cloud. All connected voter devices updated!`,
      });
      onRefresh();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to sync candidates to Firestore cloud',
      });
    } finally {
      setIsSyncingAll(false);
    }
  };

  const copyConfigJson = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-6" id="firebase-sync-manager">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Firestore Synchronization
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Firebase Cloud & Real-Time Sync
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Changes to contestants, photos, and votes broadcast globally in real time to all voters on phones, tablets, and desktops using Firestore.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSyncAllCandidatesToCloud}
              disabled={isSyncingAll}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-2 transition-transform active:scale-95 shadow-md cursor-pointer disabled:opacity-50"
              id="sync-all-firestore-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
              <span>{isSyncingAll ? 'Syncing to Cloud...' : 'Push Contestants to Cloud'}</span>
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-bold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Cloud Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-slate-500 text-xs font-semibold flex items-center gap-1.5">
            <Cloud className="w-4 h-4 text-blue-600" />
            <span>Active Project ID</span>
          </div>
          <div className="text-sm font-black text-slate-900 font-mono truncate">
            {config.projectId || 'Not Configured'}
          </div>
          <div className="text-[10px] text-slate-400">
            {isCustom ? 'Custom Firebase Project' : 'Provisioned Cloud Instance'}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-slate-500 text-xs font-semibold flex items-center gap-1.5">
            <Database className="w-4 h-4 text-amber-600" />
            <span>Firestore Database</span>
          </div>
          <div className="text-sm font-black text-slate-900 font-mono truncate">
            {config.firestoreDatabaseId || '(default)'}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Real-time listener attached
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-slate-500 text-xs font-semibold flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Contestants in Cloud</span>
          </div>
          <div className="text-sm font-black text-slate-900 font-mono">
            {candidates.length} Contestants Active
          </div>
          <div className="text-[10px] text-slate-400">Instant cross-phone updates</div>
        </div>
      </div>

      {/* Configuration Editor Block */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-900" />
              <span>Firebase Configuration Block</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Paste your Firebase project credentials or adjust individual keys below.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setUseJsonMode(!useJsonMode)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              {useJsonMode ? 'Switch to Form Fields' : 'Switch to Raw JSON Paste'}
            </button>
            <button
              onClick={copyConfigJson}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              title="Copy JSON to clipboard"
            >
              {copiedKey ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {useJsonMode ? (
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Paste Firebase Config JSON:
            </label>
            <textarea
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
              rows={9}
              className="w-full p-4 font-mono text-xs bg-slate-900 text-emerald-400 rounded-2xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-900"
              placeholder={`{\n  "apiKey": "AIzaSy...",\n  "projectId": "your-project-id",\n  "appId": "1:...",\n  "authDomain": "...",\n  "firestoreDatabaseId": "(default)"\n}`}
              id="firebase-json-textarea"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Project ID (projectId) *
              </label>
              <input
                type="text"
                value={config.projectId}
                onChange={(e) => setConfig({ ...config, projectId: e.target.value })}
                placeholder="e.g. chc-voting-prod"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                id="firebase-projectid-input"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                API Key (apiKey) *
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder="AIzaSy..."
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                  id="firebase-apikey-input"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                App ID (appId)
              </label>
              <input
                type="text"
                value={config.appId}
                onChange={(e) => setConfig({ ...config, appId: e.target.value })}
                placeholder="1:802559774792:web:..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                id="firebase-appid-input"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Firestore Database ID (optional)
              </label>
              <input
                type="text"
                value={config.firestoreDatabaseId || ''}
                onChange={(e) => setConfig({ ...config, firestoreDatabaseId: e.target.value })}
                placeholder="(default) or custom ID"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                id="firebase-dbid-input"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Auth Domain (authDomain)
              </label>
              <input
                type="text"
                value={config.authDomain || ''}
                onChange={(e) => setConfig({ ...config, authDomain: e.target.value })}
                placeholder="project.firebaseapp.com"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Storage Bucket (storageBucket)
              </label>
              <input
                type="text"
                value={config.storageBucket || ''}
                onChange={(e) => setConfig({ ...config, storageBucket: e.target.value })}
                placeholder="project.firebasestorage.app"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
          </div>
        )}

        {testResult && (
          <div
            className={`p-4 rounded-2xl border text-xs font-semibold flex items-start gap-3 ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold">
                {testResult.success ? 'Firestore Connection Successful' : 'Connection Failed'}
              </div>
              <div className="text-slate-600 mt-0.5">{testResult.message}</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              id="test-firebase-btn"
            >
              <Sparkles className={`w-3.5 h-3.5 text-blue-900 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testing Firestore...' : 'Test Connection'}</span>
            </button>

            {isCustom && (
              <button
                onClick={handleRestoreDefaults}
                className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Reset to default provisioned Firebase instance"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Defaults</span>
              </button>
            )}
          </div>

          <button
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white text-xs font-black flex items-center gap-2 transition-transform active:scale-95 shadow-md cursor-pointer disabled:opacity-50"
            id="save-firebase-config-btn"
          >
            <Cloud className="w-3.5 h-3.5 text-amber-400" />
            <span>{isSaving ? 'Saving...' : 'Save & Activate Cloud Sync'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

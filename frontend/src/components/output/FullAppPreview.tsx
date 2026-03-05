/**
 * Full App Preview - Serves generated code as a live preview with background backend startup.
 *
 * Flow:
 * 1. Click Launch → static preview loads instantly (with mock data fallback)
 * 2. Backend starts in background (npm install, etc.)
 * 3. When backend is live → iframe auto-upgrades to the live server URL
 * 4. If backend fails → stays on static preview, user sees UI with mock data
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { projectsApi } from '@/services/api';
import { Play, Square, ExternalLink, AlertCircle, Wrench, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useStore } from '@/store/useStore';

interface FullAppPreviewProps {
  projectId: string | null;
}

const FIX_PREVIEW_BASE = `The full app preview shows a blank screen. Common cause: "Uncaught SyntaxError: Unexpected token '<'"—this means JS/CSS requests returned HTML (404 page) instead of the actual files. Fix the index.html: ensure all script src and link href point to files that actually exist. Use relative paths (e.g. ./static/bundle.js or ./assets/xxx.js) so assets load under /preview/xxx/.`;

function buildFixMessage(detail?: string | null): string {
  if (detail && detail.length > 0) {
    return `The full app preview shows a blank screen with error: "${detail}". Fix the index.html and ensure all script src and link href point to files that actually exist. Use relative paths (e.g. ./static/bundle.js or ./assets/xxx.js) so assets load under /preview/xxx/.`;
  }
  return FIX_PREVIEW_BASE;
}

type BackendStatus = 'none' | 'starting' | 'live' | 'failed';

export const FullAppPreview: React.FC<FullAppPreviewProps> = ({ projectId }) => {
  const { currentProject, setWorkflowState, setLoading: setStoreLoading, setStreaming } = useStore();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewLoadError, setPreviewLoadError] = useState<string | null>(null);
  const [fixing, setFixing] = useState(false);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('none');
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const pid = projectId || currentProject?.id;

  const resolveUrl = (url: string) =>
    url.startsWith('http') ? url : window.location.origin + url;

  // Poll preview status for backend upgrade
  const startPolling = useCallback(() => {
    if (!pid || pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await projectsApi.getPreviewStatus(pid);
        const newBackendStatus = (res.backend_status || 'none') as BackendStatus;
        setBackendStatus(newBackendStatus);

        if (newBackendStatus === 'live' && res.url) {
          const liveUrl = resolveUrl(res.url);
          setPreviewUrl(liveUrl);
          setPreviewLoadError(null);
          // Stop polling once live
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        } else if (newBackendStatus === 'failed') {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      } catch {
        // Ignore polling errors
      }
    }, 5000);
  }, [pid]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!pid) return;
    try {
      const res = await projectsApi.getPreviewStatus(pid);
      if (res.status === 'running' && res.url) {
        const url = resolveUrl(res.url);
        setPreviewUrl(url);
        setError(null);
        setPreviewLoadError(null);
        setBackendStatus((res.backend_status || 'none') as BackendStatus);
        if (res.backend_status === 'starting') {
          startPolling();
        }
      } else {
        setPreviewUrl(null);
      }
    } catch {
      setPreviewUrl(null);
    }
  }, [pid, startPolling]);

  useEffect(() => {
    if (!pid) {
      setPreviewUrl(null);
      return;
    }
    fetchStatus();
  }, [pid, fetchStatus]);

  useEffect(() => {
    return () => {
      stopPolling();
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [stopPolling]);

  const handleStart = async () => {
    if (!pid) return;
    setLoading(true);
    setError(null);
    setBackendStatus('none');
    try {
      const res = await projectsApi.startPreview(pid);
      const url = resolveUrl(res.url);
      setPreviewUrl(url);
      setPreviewLoadError(null);
      const bs = (res.backend_status || 'none') as BackendStatus;
      setBackendStatus(bs);
      if (bs === 'starting') {
        startPolling();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to start preview');
      setPreviewUrl(null);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!pid) return;
    setLoading(true);
    stopPolling();
    try {
      await projectsApi.stopPreview(pid);
      setPreviewUrl(null);
      setBackendStatus('none');
    } finally {
      setLoading(false);
    }
  };

  const handleFixPreview = useCallback(async () => {
    if (!pid || fixing) return;
    setFixing(true);
    setStoreLoading(true);
    setStreaming(true);
    setError(null);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    const es = projectsApi.events(pid);
    eventSourceRef.current = es;
    es.addEventListener('workflow_complete', async () => {
      try {
        const state = await projectsApi.getState(pid);
        if (state) setWorkflowState(state);
        setPreviewLoadError(null);
        await projectsApi.stopPreview(pid);
        setPreviewUrl(null);
        const res = await projectsApi.startPreview(pid);
        const url = resolveUrl(res.url);
        setPreviewUrl(url);
        setBackendStatus((res.backend_status || 'none') as BackendStatus);
        if (res.backend_status === 'starting') startPolling();
      } catch (e) {
        console.error('Refresh after fix failed:', e);
      } finally {
        setFixing(false);
        setStoreLoading(false);
        setStreaming(false);
        es.close();
        eventSourceRef.current = null;
      }
    });
    es.addEventListener('workflow_error', () => {
      setFixing(false);
      setStoreLoading(false);
      setStreaming(false);
      es.close();
      eventSourceRef.current = null;
    });
    try {
      await projectsApi.modify(pid, buildFixMessage(previewLoadError));
    } catch (e: unknown) {
      setFixing(false);
      setStoreLoading(false);
      setStreaming(false);
      setError(e instanceof Error ? e.message : 'Failed to apply fix');
      es.close();
      eventSourceRef.current = null;
    }
  }, [pid, fixing, previewLoadError, setWorkflowState, setStoreLoading, setStreaming, startPolling]);

  if (!pid) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        No project selected
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex-shrink-0 flex items-center gap-2 p-2 border-b bg-muted/30">
        {!previewUrl ? (
          <Button size="sm" onClick={handleStart} disabled={loading}>
            <Play className="h-3.5 w-3.5 mr-1.5" />
            {loading ? 'Starting…' : 'Launch Full App Preview'}
          </Button>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={handleStop} disabled={loading}>
              <Square className="h-3.5 w-3.5 mr-1.5" />
              Stop
            </Button>
            <Button
              size="sm"
              variant={previewLoadError ? 'default' : 'outline'}
              onClick={handleFixPreview}
              disabled={fixing}
              title="Fix blank screen or asset loading errors by prompting the AI to correct the code"
            >
              <Wrench className="h-3.5 w-3.5 mr-1.5" />
              {fixing ? 'Fixing…' : 'Fix Preview'}
            </Button>
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Open in new tab
            </a>

            {/* Backend status indicator */}
            {backendStatus === 'starting' && (
              <span className="ml-auto flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-2 py-1 rounded-md">
                <Loader2 className="h-3 w-3 animate-spin" />
                Backend starting…
              </span>
            )}
            {backendStatus === 'live' && (
              <span className="ml-auto flex items-center gap-1.5 text-xs text-green-600 bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded-md">
                <CheckCircle2 className="h-3 w-3" />
                Backend live
              </span>
            )}
            {backendStatus === 'failed' && (
              <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                <XCircle className="h-3 w-3" />
                Static preview (backend unavailable)
              </span>
            )}
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex-shrink-0 flex items-center gap-2 p-2 text-destructive text-sm bg-destructive/10">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Preview area */}
      <div className="flex-1 min-h-0 relative bg-white">
        {previewUrl ? (
          <>
            {previewLoadError && (
              <div className="absolute top-2 left-2 right-2 z-10 flex items-center gap-2 p-2 text-amber-700 text-sm bg-amber-100 rounded-md">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                Preview may not load correctly: {previewLoadError}
                <span className="text-xs">— Click &quot;Fix Preview&quot; to have the AI correct the code.</span>
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={previewUrl}
              title="Full Application Preview"
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              referrerPolicy="no-referrer-when-downgrade"
              onLoad={() => setPreviewLoadError(null)}
              onError={() => setPreviewLoadError('Failed to load preview')}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-muted-foreground p-6">
            <Play className="h-16 w-16 mb-4 opacity-30" />
            <p className="font-medium">Full Application Preview</p>
            <p className="text-sm mt-1 max-w-sm">
              Run the complete generated app with all files, scripts, and assets.
              Click &quot;Launch Full App Preview&quot; to start.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

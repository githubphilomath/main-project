/**
 * Full App Preview - Runs the complete generated application with backend, APIs, etc.
 * Serves all code artifacts so users can interact with the app like the final product.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { projectsApi } from '@/services/api';
import { Play, Square, ExternalLink, AlertCircle, Wrench } from 'lucide-react';
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

export const FullAppPreview: React.FC<FullAppPreviewProps> = ({ projectId }) => {
  const { currentProject, setWorkflowState, setLoading: setStoreLoading, setStreaming } = useStore();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewLoadError, setPreviewLoadError] = useState<string | null>(null);
  const [fixing, setFixing] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const pid = projectId || currentProject?.id;

  const fetchStatus = useCallback(async () => {
    if (!pid) return;
    try {
      const res = await projectsApi.getPreviewStatus(pid);
      if (res.status === 'running' && res.url) {
        const url = res.url.startsWith('http') ? res.url : window.location.origin + res.url;
        setPreviewUrl(url);
        setError(null);
        setPreviewLoadError(null);
        // Pre-flight: verify preview URL returns 200 before iframe loads
        try {
          const r = await fetch(url, { method: 'HEAD' });
          if (!r.ok) setPreviewLoadError(`Preview returned ${r.status}`);
        } catch {
          setPreviewLoadError('Could not reach preview server');
        }
      } else {
        setPreviewUrl(null);
      }
    } catch {
      setPreviewUrl(null);
    }
  }, [pid]);

  useEffect(() => {
    if (!pid) {
      setPreviewUrl(null);
      return;
    }
    fetchStatus();
  }, [pid, fetchStatus]);

  const handleStart = async () => {
    if (!pid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await projectsApi.startPreview(pid);
      const url = res.url.startsWith('http') ? res.url : window.location.origin + res.url;
      setPreviewUrl(url);
      setPreviewLoadError(null);
      try {
        const r = await fetch(url, { method: 'HEAD' });
        if (!r.ok) setPreviewLoadError(`Preview returned ${r.status}`);
      } catch {
        setPreviewLoadError('Could not reach preview server');
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
    try {
      await projectsApi.stopPreview(pid);
      setPreviewUrl(null);
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
        const url = res.url.startsWith('http') ? res.url : window.location.origin + res.url;
        setPreviewUrl(url);
        try {
          const r = await fetch(url, { method: 'HEAD' });
          if (!r.ok) setPreviewLoadError(`Preview returned ${r.status}`);
        } catch {
          setPreviewLoadError('Could not reach preview server');
        }
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
  }, [pid, fixing, previewLoadError, setWorkflowState, setStoreLoading, setStreaming]);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

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
              Stop Preview
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

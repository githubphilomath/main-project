/**
 * Live Preview - Renders HTML in iframe for web projects
 */

import React, { useMemo, useEffect } from 'react';

interface LivePreviewProps {
  html: string;
}

export const LivePreview: React.FC<LivePreviewProps> = ({ html }) => {
  const blobUrl = useMemo(() => {
    const blob = new Blob([html], { type: 'text/html' });
    return URL.createObjectURL(blob);
  }, [html]);

  useEffect(() => () => URL.revokeObjectURL(blobUrl), [blobUrl]);

  return (
    <iframe
      src={blobUrl}
      title="Live Preview"
      className="w-full h-full border-0 bg-white"
      sandbox="allow-scripts allow-same-origin"
    />
  );
};

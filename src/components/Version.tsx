'use client';

import { useEffect, useState } from 'react';

export default function Version() {
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    // Get version from package.json
    fetch('/api/version')
      .then(res => res.json())
      .then(data => setVersion(data.version))
      .catch(() => {
        // Fallback to hardcoded version if API fails
        setVersion('0.2.0');
      });
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-1.5">
        <span className="text-xs text-gray-400">
          v{version}
        </span>
      </div>
    </div>
  );
}

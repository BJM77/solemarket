"use client";

import { useState, useEffect } from 'react';

export default function DebugPage() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testServerAction = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/debug');
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testServerAction();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Debug Page</h1>
      <button onClick={testServerAction} disabled={loading}>
        {loading ? 'Testing...' : 'Test Server Action'}
      </button>
      {result && (
        <div style={{ marginTop: '20px', background: '#f5f5f5', padding: '15px', borderRadius: '5px' }}>
          <h3>API Response:</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
      {error && (
        <div style={{ marginTop: '20px', background: '#ffebee', padding: '15px', borderRadius: '5px', color: '#c62828' }}>
          <h3>Error:</h3>
          <pre>{error}</pre>
        </div>
      )}
      <div style={{ marginTop: '30px' }}>
        <h3>LocalStorage Contents:</h3>
        <pre>
          {typeof window !== 'undefined' 
            ? JSON.stringify({
                namesToKeep: localStorage.getItem('namesToKeep'),
                scanHistory: localStorage.getItem('scanHistory'),
                errorLog: localStorage.getItem('errorLog')
              }, null, 2)
            : 'Cannot access localStorage on server'}
        </pre>
      </div>
    </div>
  );
}

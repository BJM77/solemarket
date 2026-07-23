"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function TestGeminiPage() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [testType, setTestType] = useState<'simple' | 'vision'>('simple');

  const testGoogleAI = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      let endpoint = '/api/debug/google-ai';
      if (testType === 'vision') {
        endpoint = '/api/debug/google-ai-vision';
      }

      const response = await fetch(endpoint);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API test failed');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
       <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
               <Link href="/samcam">CardScan Pro</Link>
            </h1>
            <nav className="flex gap-4">
              <Link href="/samcam" className="text-gray-600 hover:text-gray-900">Home</Link>
            </nav>
          </div>
        </div>
      </header>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Google Gemini AI Test</h1>

        <div className="mb-6 space-y-4">
          <div className="flex gap-4">
            <button
              onClick={() => setTestType('simple')}
              className={`px-4 py-2 rounded ${testType === 'simple' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Simple Text Test
            </button>
            <button
              onClick={() => setTestType('vision')}
              className={`px-4 py-2 rounded ${testType === 'vision' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Vision Model Test
            </button>
          </div>

          <button
            onClick={testGoogleAI}
            disabled={loading}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : `Test ${testType === 'vision' ? 'Vision' : 'Simple'} AI`}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-bold text-red-800 mb-2">Error:</h3>
            <pre className="text-red-700 whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        {result && (
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-2">Result:</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
            </div>
          </div>
        )}

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-bold text-yellow-800 mb-2">Troubleshooting Steps:</h3>
          <ol className="list-decimal pl-5 space-y-2 text-yellow-700">
            <li>Check that <code className="bg-yellow-100 px-1">GOOGLE_API_KEY</code> is set in <code className="bg-yellow-100 px-1">.env.local</code></li>
            <li>Verify the API key has access to Gemini models</li>
            <li>Ensure you're using a model that supports vision (gemini-1.5-flash or gemini-pro-vision)</li>
            <li>Check that billing is enabled on your Google Cloud account</li>
            <li>Try the simple test first, then the vision test</li>
          </ol>
        </div>

        <div className="mt-6">
          <h3 className="font-bold mb-2">Environment Check:</h3>
          <div className="bg-gray-100 p-4 rounded">
            <p><strong>GOOGLE_API_KEY:</strong> {process.env.NEXT_PUBLIC_GOOGLE_API_KEY ? 'Set (public)' : 'Not set (public)'}</p>
            <p className="text-sm text-gray-600 mt-2">Note: The actual GOOGLE_API_KEY is a server-side variable. Check your .env.local file.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

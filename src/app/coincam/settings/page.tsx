"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle, RefreshCw, Server, ShieldCheck, FileKey2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../auth-provider';

type CheckStatus = 'pending' | 'success' | 'error';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [envStatus, setEnvStatus] = useState<CheckStatus>('pending');
  const [authStatus, setAuthStatus] = useState<CheckStatus>('pending');
  const [networkStatus, setNetworkStatus] = useState<CheckStatus>('pending');
  const [networkMessage, setNetworkMessage] = useState('');
  
  const [isChecking, setIsChecking] = useState(false);

  const runDiagnostics = useCallback(async () => {
    setIsChecking(true);
    setNetworkMessage('Pinging Benched API...');
    
    // 1. Check Environment Variables
    const hasBenchedUrl = !!process.env.NEXT_PUBLIC_BENCHED_API_URL;
    const hasFirebaseKey = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (hasBenchedUrl && hasFirebaseKey) {
      setEnvStatus('success');
    } else {
      setEnvStatus('error');
    }
    
    // 2. Check Auth Status
    if (!authLoading) {
      if (user) {
        setAuthStatus('success');
      } else {
        setAuthStatus('error');
      }
    }
    
    // 3. Network / CORS Ping
    const apiUrl = process.env.NEXT_PUBLIC_BENCHED_API_URL || "http://localhost:3000/api/listings";
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({})
      });
      
      setNetworkStatus('success');
      setNetworkMessage(`Successfully reached ${apiUrl}. Status: ${response.status}`);
    } catch (error: any) {
      if (error.name === 'TypeError') {
         setNetworkStatus('error');
         setNetworkMessage("Network Error: Benched API is unreachable. The server is either offline or blocked by CORS.");
      } else {
         setNetworkStatus('error');
         setNetworkMessage(`Error: ${error.message}`);
      }
    }
    
    setIsChecking(false);
  }, [authLoading, user]);

  useEffect(() => {
    if (!authLoading) {
      runDiagnostics();
    }
  }, [authLoading, runDiagnostics]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="flex items-center justify-between p-4 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-20">
        <Button variant="outline" size="icon" onClick={() => router.push('/coincam')}>
          <ArrowLeft className="w-6 h-6" />
          <span className="sr-only">Back</span>
        </Button>
        <h1 className="text-2xl font-bold font-headline text-primary">Integration Status</h1>
        <div className="w-10"></div>
      </header>

      <main className="max-w-3xl mx-auto p-4 md:p-8 mt-6">
        <Card className="shadow-lg border-primary/20">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl mb-2">CoinCam Diagnostics</CardTitle>
                <CardDescription>
                  Verify that your CoinCam app is correctly configured to communicate with the Benched.au backend.
                </CardDescription>
              </div>
              <Button onClick={runDiagnostics} disabled={isChecking || authLoading} variant="outline" size="sm">
                <RefreshCw className={`w-4 h-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
                Re-test
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 border">
              <div className="mt-1">
                {envStatus === 'pending' ? <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" /> : 
                 envStatus === 'success' ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : 
                 <XCircle className="w-6 h-6 text-red-500" />}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <FileKey2 className="w-4 h-4 text-primary" /> Environment Configuration
                </h3>
                {envStatus === 'success' ? (
                  <p className="text-sm text-muted-foreground mt-1">All required API keys and endpoint URLs are present in `.env.local`.</p>
                ) : envStatus === 'error' ? (
                  <div className="mt-2 text-sm">
                    <p className="text-red-500 font-medium">Missing Configuration</p>
                    <p className="text-muted-foreground mt-1">Please ensure configuration variables are set in your environment.</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">Checking environment variables...</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 border">
              <div className="mt-1">
                {authStatus === 'pending' || authLoading ? <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" /> : 
                 authStatus === 'success' ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : 
                 <XCircle className="w-6 h-6 text-red-500" />}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" /> Firebase Authentication
                </h3>
                {authStatus === 'success' ? (
                  <p className="text-sm text-muted-foreground mt-1">You are actively logged in. We can successfully generate a secure ID Token.</p>
                ) : authStatus === 'error' ? (
                  <div className="mt-2 text-sm">
                    <p className="text-red-500 font-medium">Not Logged In</p>
                    <p className="text-muted-foreground mt-1">You must be logged into CoinCam via Firebase Auth to push listings to Benched.au.</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">Verifying Firebase session...</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 border">
              <div className="mt-1">
                {networkStatus === 'pending' ? <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" /> : 
                 networkStatus === 'success' ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : 
                 <XCircle className="w-6 h-6 text-red-500" />}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Server className="w-4 h-4 text-primary" /> API Reachability & CORS
                </h3>
                {networkStatus === 'success' ? (
                   <div className="mt-2 text-sm">
                    <p className="text-green-600 font-medium">Connection Successful</p>
                    <p className="text-muted-foreground mt-1">{networkMessage}</p>
                   </div>
                ) : networkStatus === 'error' ? (
                  <div className="mt-2 text-sm">
                    <p className="text-red-500 font-medium">Connection Failed</p>
                    <p className="text-muted-foreground mt-1">{networkMessage}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">{networkMessage || "Preparing to ping API..."}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

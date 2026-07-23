"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle, RefreshCw, Server, ShieldCheck, FileKey2 } from 'lucide-react';
import { Button } from '@/samcam/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/samcam/components/ui/card';
import { useAuth } from '@/app/samcam/auth-provider';

type CheckStatus = 'pending' | 'success' | 'error';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [envStatus, setEnvStatus] = useState<CheckStatus>('pending');
  const [authStatus, setAuthStatus] = useState<CheckStatus>('pending');
  const [networkStatus, setNetworkStatus] = useState<CheckStatus>('pending');
  const [networkMessage, setNetworkMessage] = useState('');
  
  const [isChecking, setIsChecking] = useState(false);

  const runDiagnostics = async () => {
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
        // Don't send a real body, we just want to see if the server responds at all
        body: JSON.stringify({})
      });
      
      // If we reach here, the server responded! (even if it's a 400 or 401, it means CORS allowed it and network is up)
      setNetworkStatus('success');
      setNetworkMessage(`Successfully reached ${apiUrl}. Status: ${response.status}`);
    } catch (error: any) {
      // TypeError usually means CORS rejection or network unreachable (offline/server down)
      if (error.name === 'TypeError') {
         setNetworkStatus('error');
         setNetworkMessage("Network Error: Benched API is unreachable. The server is either offline, the URL is wrong, or Benched.au has CORS restrictions blocking CardScan.");
      } else {
         setNetworkStatus('error');
         setNetworkMessage(`Error: ${error.message}`);
      }
    }
    
    setIsChecking(false);
  };

  useEffect(() => {
    if (!authLoading) {
      runDiagnostics();
    }
  }, [authLoading, user]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="flex items-center justify-between p-4 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-20">
        <Button variant="outline" size="icon" onClick={() => router.push('/samcam')}>
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
                <CardTitle className="text-2xl mb-2">Benched.au Diagnostics</CardTitle>
                <CardDescription>
                  Verify that your CardScan app is correctly configured to communicate with the Benched.au backend.
                </CardDescription>
              </div>
              <Button onClick={runDiagnostics} disabled={isChecking || authLoading} variant="outline" size="sm">
                <RefreshCw className={`w-4 h-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
                Re-test
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Environment Variables Check */}
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
                    <p className="text-muted-foreground mt-1">Please ensure `NEXT_PUBLIC_BENCHED_API_URL` and `NEXT_PUBLIC_FIREBASE_API_KEY` are set in your `.env.local` file.</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">Checking environment variables...</p>
                )}
              </div>
            </div>

            {/* Auth Check */}
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
                    <p className="text-muted-foreground mt-1">You must be logged into the CardScan app via Firebase Auth to push listings to Benched.au.</p>
                    <Button variant="link" className="px-0 mt-1 h-auto" onClick={() => router.push('/samcam/login')}>Go to Login Page</Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">Verifying Firebase session...</p>
                )}
              </div>
            </div>

            {/* Network / CORS Check */}
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
                    <div className="bg-background/80 p-3 rounded mt-3 border text-xs font-mono">
                      If it's a CORS issue, add this to Benched.au next.config.js / route.ts:
                      <br/>
                      headers: {'{ "Access-Control-Allow-Origin": "*" }'}
                    </div>
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




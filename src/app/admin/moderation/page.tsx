'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, ShieldAlert, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { moderateContent, type ModerateContentOutput } from '@/ai/flows/ai-content-moderation';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';

const MOCK_QUEUE = [
  { id: '1', type: 'Product', reason: 'Counterfeit Suspected', targetId: 'prod_123', status: 'Pending', reportedBy: 'user_456' },
  { id: '2', type: 'User', reason: 'Abusive Language in Messages', targetId: 'user_789', status: 'Pending', reportedBy: 'user_111' },
];

export default function ModerationPage() {
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [result, setResult] = useState<ModerateContentOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const [queue, setQueue] = useState(MOCK_QUEUE);

  const handleAnalyze = async () => {
    if (!productName.trim() || !productDescription.trim()) {
      toast({ title: 'Please enter a product name and description.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setResult(null);
    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) throw new Error("Authentication required");

      const analysisResult = await moderateContent({ productName, productDescription, idToken });
      setResult(analysisResult);
    } catch (error: any) {
      console.error('Moderation Error:', error);
      toast({
        title: 'Analysis Failed',
        description: error.message || 'The AI service could not be reached.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (id: string, action: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
    toast({ title: `Action Taken: ${action}`, description: `Item ${id} has been processed.` });
  };

  return (
    <div className="space-y-12">
      <PageHeader
        title="Trust & Safety Hub"
        description="Review AI flags, handle user reports, and maintain platform integrity."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Moderation', href: '/admin/moderation' },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Live Moderation Queue */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              Action Queue
            </CardTitle>
            <CardDescription>Items flagged by users or AI requiring manual review.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {queue.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Queue is empty. Great job!</p>
              </div>
            ) : (
              queue.map((item) => (
                <div key={item.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <div>
                    <div className="flex gap-2 items-center mb-1">
                      <Badge variant={item.type === 'Product' ? 'default' : 'secondary'}>{item.type}</Badge>
                      <span className="text-sm font-bold">{item.reason}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">Target: {item.targetId} • Reporter: {item.reportedBy}</p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => handleAction(item.id, 'Dismissed')}>Dismiss</Button>
                    <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleAction(item.id, 'Deleted/Suspended')}>
                      {item.type === 'User' ? 'Suspend' : 'Delete'}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* AI Testing Sandbox */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              AI Listing Analyzer Sandbox
            </CardTitle>
            <CardDescription>
              Test the AI moderation engine against edge cases manually.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Product Name (e.g. Jordan 1 Chicago)"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="bg-slate-950 border-slate-800"
              />
            </div>
            <div className="space-y-2">
              <Textarea
                placeholder="Product Description (Paste questionable description here...)"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                className="min-h-[150px] bg-slate-950 border-slate-800"
              />
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Analyze Content
            </Button>
          </CardFooter>
        </Card>

        <Card className="p-6 rounded-xl flex flex-col">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-xl font-bold">Analysis Result</CardTitle>
          </CardHeader>
          <CardContent className="px-0 flex-1 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {isLoading && (
                <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </motion.div>
              )}
              {!isLoading && !result && (
                <motion.div key="initial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-muted-foreground">
                  <ShieldCheck className="h-16 w-16 mx-auto mb-4" />
                  <p>Your analysis results will appear here.</p>
                </motion.div>
              )}
              {result && (
                <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-4 text-sm">
                  <div className={`flex items-center justify-between rounded-xl p-4 ${result.isCompliant ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    <div>
                      <p className="font-bold">{result.isCompliant ? 'Content Compliant' : 'Policy Violation Detected'}</p>
                      <p className="text-xs opacity-80">{result.isCompliant ? 'No major issues found.' : 'Action may be required.'}</p>
                    </div>
                    {result.isCompliant ? (
                      <ShieldCheck className="h-8 w-8" />
                    ) : (
                      <ShieldAlert className="h-8 w-8" />
                    )}
                  </div>

                  <div className="border p-4 rounded-xl">
                    <p className="font-medium mb-2">Violations</p>
                    {result.policyViolations.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {result.policyViolations.map((cat) => (
                          <Badge key={cat} variant="destructive">{cat}</Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-xs">None</p>
                    )}
                  </div>

                  <div className="border p-4 rounded-xl">
                    <p className="font-medium mb-2">AI Explanation</p>
                    <p className="text-muted-foreground text-xs italic">{result.explanation}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

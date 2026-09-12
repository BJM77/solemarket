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

export default function ModerationPage() {
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [result, setResult] = useState<ModerateContentOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl lg:text-5xl font-black tracking-tighter mb-2">
          Content Moderation Lab
        </h1>
        <p className="text-muted-foreground font-medium tracking-wide uppercase text-xs">
          Use AI to analyze listings for policy violations, spam, or inappropriate content.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <Card className="p-6 rounded-xl">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-xl font-bold">Content to Analyze</CardTitle>
          </CardHeader>
          <CardContent className="px-0 space-y-4">
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Product Name..."
              className="placeholder:text-muted-foreground rounded-xl"
            />
            <Textarea
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="Paste a product title or description here..."
              rows={12}
              className="resize-none placeholder:text-muted-foreground rounded-xl"
            />
          </CardContent>
          <CardFooter className="px-0 pb-0">
            <Button onClick={handleAnalyze} disabled={isLoading} className="w-full font-bold h-12 rounded-xl">
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

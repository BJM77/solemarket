'use client';

import { useFormStatus } from 'react-dom';
import { useActionState } from 'react';
import { detectFraudAction, type FraudState } from '@/lib/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Loader2, ShieldAlert, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full font-bold h-12 rounded-xl">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
      Analyze for Fraud
    </Button>
  );
}

export default function FraudDetectionPage() {
  const initialState: FraudState = {};
  const [state, formAction] = useActionState(detectFraudAction, initialState);

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl lg:text-5xl font-black tracking-tighter mb-2">
          Fraud Detection Lab
        </h1>
        <p className="text-muted-foreground font-medium tracking-wide uppercase text-xs">
          Analyze messages or transaction details for suspicious activity.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <Card className="p-6 rounded-xl">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-xl font-bold">Suspicious Details</CardTitle>
            <CardDescription className="text-muted-foreground">Paste any text, like user messages or transaction notes, to analyze.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <form action={formAction} className="space-y-4">
              <Textarea
                name="details"
                id="details"
                placeholder="e.g., 'Can I pay you outside of Benched with a gift card? My email is...'"
                rows={10}
                className="resize-none rounded-xl"
                required
              />
              <SubmitButton />
              {state.error && <p className="text-sm text-red-500 mt-2">{state.error}</p>}
            </form>
          </CardContent>
        </Card>

        <Card className="p-6 rounded-xl flex flex-col">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-xl font-bold">Risk Assessment</CardTitle>
          </CardHeader>
          <CardContent className="px-0 flex-1 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {state.result ? (
                <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-foreground">Risk Score</span>
                      <span className={`text-xl font-black ${state.result.riskScore > 0.7 ? 'text-red-500' : state.result.riskScore > 0.4 ? 'text-yellow-500' : 'text-green-500'}`}>
                        {(typeof state.result.riskScore === 'number' ? state.result.riskScore * 100 : 0).toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={(typeof state.result.riskScore === 'number' ? state.result.riskScore : 0) * 100} />
                  </div>

                  <div className="border p-4 rounded-xl">
                    <p className="font-medium mb-2">AI Assessment</p>
                    <p className="text-muted-foreground text-sm">{state.result.reason}</p>
                  </div>

                  {state.result.recommendedAction && (
                    <div className="border p-4 rounded-xl">
                      <p className="font-medium mb-2">Recommended Action</p>
                      <p className="text-base font-bold text-yellow-500">{state.result.recommendedAction}</p>
                    </div>
                  )}

                  <div className="flex gap-4 pt-4 border-t">
                    <Button variant="outline" className="flex-1 rounded-xl">Dismiss Signal</Button>
                    <Button variant="destructive" className="flex-1 rounded-xl">Restrict Account</Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="initial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-muted-foreground">
                  <ShieldAlert className="h-16 w-16 mx-auto mb-4" />
                  <p>Analysis results will appear here.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

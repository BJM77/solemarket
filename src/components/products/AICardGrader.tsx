
'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { checkCardCondition } from '@/ai/flows/check-card-condition';
import type { CardConditionOutput } from '@/ai/flows/schemas';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn, formatPrice } from '@/lib/utils';
import { suggestListingDetails } from '@/ai/flows/suggest-listing-details';
import type { SuggestListingDetailsOutput } from '@/ai/flows/schemas';
import { useUser } from '@/firebase';

const fileToDataUri = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

interface AICardGraderProps {
  onGradeComplete?: (grade: string) => void;
  onApplySuggestions: (suggestions: SuggestListingDetailsOutput) => void;
  imageFiles: (File | Blob)[];
}

export default function AICardGrader({ onGradeComplete, onApplySuggestions, imageFiles }: AICardGraderProps) {
  const { user } = useUser();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SuggestListingDetailsOutput | null>(null);
  const { toast } = useToast();

  const handleGrade = () => {
    if (imageFiles.length === 0) {
      toast({ title: "Missing Photos", description: "Please upload at least one photo of your card.", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      try {
        const dataUris = await Promise.all(
          imageFiles.map(file => fileToDataUri(file))
        );

        const idToken = await user?.getIdToken();
        if (!idToken) throw new Error("Authentication required");

        const gradingReport = await suggestListingDetails({
          photoDataUris: dataUris,
          idToken: idToken,
        });

        setResult(gradingReport);

        if (gradingReport.condition && onGradeComplete) {
          onGradeComplete(gradingReport.condition);
        }

        toast({ title: "AI Analysis Complete!", description: "Review the suggestions below and apply them to your listing." });

      } catch (error) {
        console.error(error);
        toast({ title: "Grading Failed", description: "Could not analyze images. Please try again.", variant: "destructive" });
      }
    });
  };

  const applySuggestions = () => {
    if (result) {
      onApplySuggestions(result);
    }
  }

  return (
    <div className="w-full mx-auto border border-indigo-100 shadow-xl overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-50 to-white mb-6">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black text-indigo-950">AI Grade & Suggest</h3>
            <p className="text-sm text-muted-foreground">Get AI-powered condition & listing suggestions.</p>
          </div>
        </div>

        <Button
          size="lg"
          className="w-full h-12 text-md font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
          onClick={handleGrade}
          disabled={isPending || imageFiles.length === 0}
        >
          {isPending ? (
            <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Analyzing...</>
          ) : (
            <><Sparkles className="mr-2 h-5 w-5" />Analyze & Suggest Details</>
          )}
        </Button>

        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-6">
            <div className="space-y-4 bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <span className="text-slate-500 font-bold uppercase text-xs tracking-widest">AI Suggestions</span>
                <Button size="sm" onClick={applySuggestions} className="h-7 rounded-md">Apply All</Button>
              </div>

              <div className="grid gap-2 text-sm">
                <AISuggestion label="Title" value={result.title} />
                <AISuggestion label="Price" value={`$${formatPrice(result.price)}`} />
                <AISuggestion label="Condition" value={result.condition} />
                <AISuggestion label="Year" value={String(result.year)} />
              </div>

              <div className="flex gap-2 text-xs text-slate-400 pt-2 items-center justify-center">
                <CheckCircle2 className="h-3 w-3" />
                <span>AI Estimation • Review before publishing</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AISuggestion({ label, value }: { label: string, value: string | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
      <h5 className="text-xs font-black text-slate-400 uppercase">{label}</h5>
      <p className="text-xs font-medium text-slate-800 leading-snug text-right">{value}</p>
    </div>
  );
}

'use client';

import { useState, useTransition, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, CheckCircle2, ChevronLeft, ChevronRight, Eye, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn, formatPrice } from '@/lib/utils';
import { suggestListingDetails } from '@/ai/flows/suggest-listing-details';
import type { SuggestListingDetailsOutput } from '@/ai/flows/schemas';
import { useUser } from '@/firebase';
import { AICardDefectOverlay } from './AICardDefectOverlay';

interface AICardGraderProps {
  onGradeComplete?: (grade: string) => void;
  onApplySuggestions: (suggestions: SuggestListingDetailsOutput) => void;
  imageFiles: (File | Blob)[];
}

export default function AICardGrader({ onGradeComplete, onApplySuggestions, imageFiles }: AICardGraderProps) {
  const { user } = useUser();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SuggestListingDetailsOutput | null>(null);
  const [activeTab, setActiveTab] = useState<'defects' | 'subgrades'>('defects');
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [previews, setPreviews] = useState<string[]>([]);
  const { toast } = useToast();

  // Generate previews from image files for local radar viewer
  useEffect(() => {
    const urls = imageFiles.map(file => URL.createObjectURL(file));
    setPreviews(urls);

    // Clean up object URLs to avoid memory leaks
    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imageFiles]);

  const handleGrade = () => {
    if (imageFiles.length === 0) {
      toast({ title: "Missing Photos", description: "Please upload at least one photo of your card.", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      try {
        const { resizeAndCompressImage } = await import('@/lib/utils');
        
        // Optimize payload size
        const dataUris = await Promise.all(
          imageFiles.map(file => resizeAndCompressImage(file, 600, 0.6))
        );

        const idToken = await user?.getIdToken();
        if (!idToken) throw new Error("Authentication required");

        const suggestionsResponse = await suggestListingDetails({
          photoDataUris: dataUris,
          category: 'Collector Cards',
          idToken: idToken,
        });

        if (suggestionsResponse.error) {
          throw new Error(suggestionsResponse.error);
        }

        const gradingReport = suggestionsResponse.data;
        if (gradingReport) {
          setResult(gradingReport);

          if (gradingReport.condition && onGradeComplete) {
            onGradeComplete(gradingReport.condition);
          }

          toast({ title: "AI Analysis Complete!", description: "Review visual radar flaw coordinates and sub-grades." });
        }

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
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveImageIdx(prev => (prev === 0 ? previews.length - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    setActiveImageIdx(prev => (prev === previews.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="w-full mx-auto border border-white/10 shadow-xl overflow-hidden rounded-2xl bg-card mb-6">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">AI Visual Grader</h3>
            <p className="text-sm text-muted-foreground">Scans card front & back to map defects and generate subgrades.</p>
          </div>
        </div>

        <Button
          size="lg"
          className="w-full h-12 text-md font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/10 transition-all rounded-xl"
          onClick={handleGrade}
          disabled={isPending || imageFiles.length === 0}
        >
          {isPending ? (
            <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Analyzing Flaws...</>
          ) : (
            <><Sparkles className="mr-2 h-5 w-5" />Perform AI Visual Check</>
          )}
        </Button>

        {result && previews.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-6 space-y-4">
            
            {/* Navigation Tabs */}
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.preventDefault(); setActiveTab('defects'); }}
                className={cn(
                  "flex-1 h-8 rounded-lg font-bold text-xs uppercase tracking-wider",
                  activeTab === 'defects' ? "bg-primary text-white" : "text-slate-400 hover:text-white"
                )}
              >
                Defect Radar Map
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.preventDefault(); setActiveTab('subgrades'); }}
                className={cn(
                  "flex-1 h-8 rounded-lg font-bold text-xs uppercase tracking-wider",
                  activeTab === 'subgrades' ? "bg-primary text-white" : "text-slate-400 hover:text-white"
                )}
              >
                Subgrades Summary
              </Button>
            </div>

            {/* TAB 1: DEFECT RADAR MAP */}
            {activeTab === 'defects' && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                {/* Visual Defects Overlay Wrapper */}
                <div className="relative flex flex-col items-center justify-center bg-slate-950/40 p-4 rounded-2xl border border-white/5">
                  <AICardDefectOverlay 
                    imageUrl={previews[activeImageIdx]} 
                    defects={result.defects} 
                    imageIndex={activeImageIdx} 
                  />

                  {/* Previews paginator */}
                  {previews.length > 1 && (
                    <div className="flex items-center gap-4 mt-3">
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={handlePrevImage}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Photo {activeImageIdx + 1} of {previews.length}
                      </span>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={handleNextImage}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: SUBGRADES SUMMARY TABLE */}
            {activeTab === 'subgrades' && (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-slate-950/40 rounded-2xl border border-white/5 overflow-hidden">
                  <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subgrade Assessments</span>
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold border-primary/20 text-primary bg-primary/5 uppercase tracking-wider">
                      Est. {result.condition || 'Raw'}
                    </span>
                  </div>
                  <div className="p-4 divide-y divide-white/5 text-xs">
                    <SubgradeRow label="Corners" value={result.cornersGrade} />
                    <SubgradeRow label="Edges" value={result.edgesGrade} />
                    <SubgradeRow label="Surface" value={result.surfaceGrade} />
                    <SubgradeRow label="Centering" value={result.centeringGrade} />
                  </div>
                </div>
              </div>
            )}

            {/* AI Mapping Apply Card */}
            <div className="space-y-3 bg-white/5 rounded-2xl p-4 border border-white/5">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <span className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Auto-fill Values</span>
                <Button size="sm" onClick={applySuggestions} className="h-8 rounded-lg font-bold text-xs bg-primary hover:bg-primary/95 text-white">
                  Apply Suggestions
                </Button>
              </div>

              <div className="grid gap-2 text-xs">
                <AISuggestion label="Title" value={result.title} />
                <AISuggestion label="Price" value={`$${formatPrice(result.price)}`} />
                <AISuggestion label="Condition" value={result.condition} />
                <AISuggestion label="Year" value={String(result.year)} />
              </div>

              <div className="flex gap-2 text-[10px] text-slate-400 pt-2 items-center justify-center">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                <span>AI Grade Checked • Review before publishing</span>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

interface SubgradeRowProps {
  label: string;
  value?: string;
}

function SubgradeRow({ label, value }: SubgradeRowProps) {
  if (!value) return null;
  return (
    <div className="py-2.5 flex flex-col gap-1 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between">
        <h5 className="font-bold text-white tracking-wide">{label}</h5>
        <span className="text-[10px] font-semibold text-primary uppercase">Report</span>
      </div>
      <p className="text-[11px] text-slate-400 leading-normal">{value}</p>
    </div>
  );
}

function AISuggestion({ label, value }: { label: string, value: string | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center bg-background p-2 rounded-lg border border-white/5 shadow-sm">
      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</h5>
      <p className="text-xs font-semibold text-white leading-snug text-right">{value}</p>
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Loader2, XCircle, Clock } from 'lucide-react';
import { cn } from '@/samcam/lib/utils';

export interface SyncStep {
  id: string;
  label: string;
  status: 'idle' | 'pending' | 'processing' | 'success' | 'error';
  detail?: string;
  timestamp?: string;
}

export interface SyncStatus {
  id: string;
  steps: SyncStep[];
  currentStep: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

interface SyncStatusTrackerProps {
  status: SyncStatus;
  onRetry?: (id: string) => void;
  onCancel?: (id: string) => void;
}

export function SyncStatusTracker({ status, onRetry, onCancel }: SyncStatusTrackerProps) {
  const [expanded, setExpanded] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  const isComplete = status.steps.every(s => s.status === 'success');
  const hasError = status.steps.some(s => s.status === 'error');
  const isProcessing = status.steps.some(s => s.status === 'processing');
  
  return (
    <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden mb-4">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {isComplete ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : hasError ? (
            <XCircle className="w-5 h-5 text-red-500" />
          ) : isProcessing ? (
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          ) : (
            <Clock className="w-5 h-5 text-zinc-500" />
          )}
          <div>
            <div className="font-bold text-sm text-white truncate max-w-[160px]">
              Sync: {status.id}
            </div>
            <div className="text-[10px] text-zinc-400">
              {isComplete ? 'Complete' : hasError ? 'Failed' : isProcessing ? 'Processing...' : 'Pending'}
              {mounted && status.startedAt && ` • ${new Date(status.startedAt).toLocaleTimeString()}`}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {hasError && onRetry && (
            <button
              onClick={(e) => { e.stopPropagation(); onRetry(status.id); }}
              className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-[10px] font-bold hover:bg-blue-500/30 transition"
            >
              Retry
            </button>
          )}
          {isProcessing && onCancel && (
            <button
              onClick={(e) => { e.stopPropagation(); onCancel(status.id); }}
              className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-[10px] font-bold hover:bg-red-500/30 transition"
            >
              Cancel
            </button>
          )}
          <div className="text-[10px] font-bold text-zinc-500">
            {status.steps.filter(s => s.status === 'success').length}/{status.steps.length}
          </div>
        </div>
      </div>
      
      {/* Steps */}
      {expanded && (
        <div className="border-t border-white/5 p-4 space-y-4 bg-zinc-950/40">
          {status.steps.map((step) => (
            <div key={step.id} className="flex items-start gap-3">
              {/* Step Icon */}
              <div className="mt-0.5">
                {step.status === 'success' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                )}
                {step.status === 'error' && (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                {step.status === 'processing' && (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                )}
                {step.status === 'pending' && (
                  <Circle className="w-4 h-4 text-zinc-600" />
                )}
                {step.status === 'idle' && (
                  <Circle className="w-4 h-4 text-zinc-700" />
                )}
              </div>
              
              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-xs text-white">
                    {step.label}
                  </div>
                   {mounted && step.timestamp && (
                    <div className="text-[8px] text-zinc-500 font-mono">
                      {new Date(step.timestamp).toLocaleTimeString()}
                    </div>
                  )}
                </div>
                
                {step.detail && (
                  <div className={cn(
                    "text-[10px] mt-1 font-mono break-all",
                    step.status === 'error' ? "text-red-400" :
                    step.status === 'success' ? "text-emerald-400" :
                    "text-zinc-400"
                  )}>
                    {step.detail}
                  </div>
                )}
                
                {/* Progress bar for active step */}
                {step.status === 'processing' && (
                  <div className="mt-2 w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* Error Details */}
          {status.error && (
            <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="text-[10px] text-red-400 font-mono break-all">
                ❌ {status.error}
              </div>
            </div>
          )}
          
          {/* Completion Time */}
          {mounted && status.completedAt && (
            <div className="text-[8px] text-zinc-500 text-right font-mono">
              Completed: {new Date(status.completedAt).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { CheckCircle, Circle, Loader2 } from 'lucide-react';

type Step = 'upload' | 'transcribe' | 'theme' | 'render' | 'done';

const steps: { id: Step; label: string }[] = [
  { id: 'upload', label: 'Upload' },
  { id: 'transcribe', label: 'Transcribe' },
  { id: 'theme', label: 'Theme' },
  { id: 'render', label: 'Render' },
  { id: 'done', label: 'Done' },
];

interface Props {
  currentStep: Step;
}

export function ProgressTracker({ currentStep }: Props) {
  const currentIdx = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, i) => {
        const isComplete = i < currentIdx;
        const isCurrent = i === currentIdx;

        return (
          <div key={step.id} className="flex items-center gap-2">
            {isComplete ? (
              <CheckCircle className="w-5 h-5 text-accent" />
            ) : isCurrent ? (
              <Loader2 className="w-5 h-5 text-accent animate-spin" />
            ) : (
              <Circle className="w-5 h-5 text-white/20" />
            )}
            <span className={`text-sm ${isCurrent ? 'text-accent' : isComplete ? 'text-white/60' : 'text-white/30'}`}>
              {step.label}
            </span>
            {i < steps.length - 1 && <div className="w-8 md:w-16 h-px bg-white/10 ml-2" />}
          </div>
        );
      })}
    </div>
  );
}

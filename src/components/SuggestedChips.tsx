import React from 'react';
import { TrendingUp, GraduationCap, Globe2, ShieldCheck, Flame, Compass } from 'lucide-react';

interface SuggestedChipsProps {
  onSelectQuestion: (question: string) => void;
  disabled?: boolean;
}

export const SUGGESTED_QUESTIONS = [
  {
    icon: TrendingUp,
    label: 'What has he achieved in sales?',
    category: 'Sales Leadership',
    color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-200 hover:border-amber-400',
  },
  {
    icon: GraduationCap,
    label: 'What is he studying?',
    category: 'Education & EBS',
    color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-200 hover:border-blue-400',
  },
  {
    icon: Globe2,
    label: 'What languages does he speak?',
    category: 'Languages',
    color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-200 hover:border-emerald-400',
  },
  {
    icon: ShieldCheck,
    label: 'Tell me about the G4S project',
    category: 'Direct-to-Consumer',
    color: 'from-violet-500/20 to-purple-500/10 border-violet-500/30 text-violet-200 hover:border-violet-400',
  },
  {
    icon: Flame,
    label: 'What was his US door-to-door sales experience?',
    category: 'Southwestern Advantage',
    color: 'from-rose-500/20 to-pink-500/10 border-rose-500/30 text-rose-200 hover:border-rose-400',
  },
  {
    icon: Compass,
    label: 'What are his key leadership strengths?',
    category: 'Strengths & Mindset',
    color: 'from-indigo-500/20 to-sky-500/10 border-indigo-500/30 text-indigo-200 hover:border-indigo-400',
  },
];

export const SuggestedChips: React.FC<SuggestedChipsProps> = ({
  onSelectQuestion,
  disabled = false,
}) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
          <span>Suggested Questions</span>
          <span className="text-[10px] text-neutral-500 font-mono font-normal">
            (Tap to ask Ari directly)
          </span>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {SUGGESTED_QUESTIONS.map((chip, idx) => {
          const Icon = chip.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectQuestion(chip.label)}
              disabled={disabled}
              className={`group flex items-center text-left p-2.5 rounded-xl bg-gradient-to-r ${chip.color} border backdrop-blur-md transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none shadow-sm`}
            >
              <div className="p-1.5 rounded-lg bg-neutral-900/80 mr-2.5 shrink-0 group-hover:scale-110 transition-transform">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-neutral-100 group-hover:text-white truncate">
                  {chip.label}
                </p>
                <p className="text-[10px] text-neutral-400/80 uppercase font-mono tracking-wider">
                  {chip.category}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

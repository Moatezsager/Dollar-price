import React from "react";
import { TooltipRenderProps } from 'react-joyride';
import { X, ArrowRight } from "lucide-react";

interface TourTooltipProps extends TooltipRenderProps {
  setRunTour: (run: boolean) => void;
}

export const TourTooltip: React.FC<TourTooltipProps> = ({
  continuous,
  index,
  step,
  size,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
  isLastStep,
  setRunTour
}) => {
  const isFirstStep = index === 0;
  
  return (
    <div 
      {...tooltipProps} 
      className="relative bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-3xl p-6 w-[360px] max-w-[90vw] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] overflow-hidden" 
      dir="rtl"
    >
      {/* Glow effect */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-[60px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 blur-[60px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/2"></div>

      {/* Header */}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center border border-emerald-500/20 shrink-0">
            <span className="text-emerald-400 font-black text-lg">{index + 1}</span>
          </div>
          <h3 className="text-white font-black text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-l from-white to-zinc-400">
            {step.title}
          </h3>
        </div>
        
        <button 
          {...closeProps} 
          className="text-zinc-500 hover:text-white hover:bg-white/10 transition-all p-1.5 rounded-full shrink-0 group"
          onClick={(e) => {
            if (closeProps.onClick) closeProps.onClick(e);
            setRunTour(false);
            localStorage.setItem('tourCompleted', 'true');
          }}
        >
          <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>

      {/* Content */}
      <div className="text-zinc-400 text-sm leading-relaxed mb-8 font-medium relative z-10 pl-2 pr-2">
        {step.content}
      </div>

      {/* Progress & Actions */}
      <div className="flex flex-col gap-4 relative z-10">
        {/* Custom Progress Bar */}
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-l from-emerald-500 to-blue-500 rounded-full transition-all duration-500 relative"
            style={{ width: `${((index + 1) / size) * 100}%` }}
          >
            <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button {...backProps} className="px-3 py-2 text-xs font-bold text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-all uppercase tracking-widest">
                السابق
              </button>
            )}
            {isFirstStep && (
              <button {...skipProps} className="px-3 py-2 text-xs font-bold text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-all uppercase tracking-widest">
                تخطي الجولة
              </button>
            )}
          </div>
          
          <button 
            {...primaryProps} 
            className="group px-6 py-2.5 text-xs font-black bg-gradient-to-l from-emerald-500 to-emerald-400 text-[#050505] rounded-xl hover:from-emerald-400 hover:to-emerald-300 transition-all shadow-[0_8px_20px_-6px_rgba(16,185,129,0.5)] active:scale-95 uppercase tracking-widest flex items-center gap-2"
          >
            {isLastStep ? 'إنهاء الجولة' : 'التالي'}
            {!isLastStep && <ArrowRight className="w-3.5 h-3.5 -scale-x-100 group-hover:translate-x-1 transition-transform" />}
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Turn } from '../types';

interface TranscriptFeedProps {
  history: Turn[];
  realtimeInput: string;
  realtimeOutput: string;
  endRef: React.RefObject<HTMLDivElement>;
  variant: 'mobile' | 'desktop';
}

const CONTEXT_UPDATE_REGEX = /\[CONTEXT_UPDATE:[\s\S]*?\]/g;

export const TranscriptFeed: React.FC<TranscriptFeedProps> = ({
  history,
  realtimeInput,
  realtimeOutput,
  endRef,
  variant,
}) => {
  if (variant === 'mobile') {
    return (
      <>
        {history.map((turn, i) => {
          const displayOutput = turn.output ? turn.output.replace(CONTEXT_UPDATE_REGEX, '').trim() : '';
          return (
            <div key={i} className="space-y-2">
              {turn.input && (
                <div className="flex justify-end">
                  <div className="bg-blue-600/20 border border-blue-500/20 rounded-2xl px-4 py-2 text-white text-xs backdrop-blur-md">
                    {turn.input}
                  </div>
                </div>
              )}
              {displayOutput && (
                <div className="flex justify-start">
                  <div className="text-white text-sm font-light leading-relaxed drop-shadow-md">
                    {displayOutput}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {(realtimeInput || realtimeOutput) && (
          <div className="animate-pulse space-y-2">
            {realtimeInput && (
              <div className="flex justify-end">
                <div className="bg-blue-600/20 border border-blue-500/20 rounded-2xl px-4 py-2 text-white text-xs backdrop-blur-md">
                  {realtimeInput}
                </div>
              </div>
            )}
            {realtimeOutput && (
              <div className="flex justify-start">
                <div className="text-white text-sm font-light leading-relaxed">
                  {realtimeOutput.replace(CONTEXT_UPDATE_REGEX, '')}
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={endRef} />
      </>
    );
  }

  return (
    <>
      {history.map((turn, i) => {
        const displayOutput = turn.output ? turn.output.replace(CONTEXT_UPDATE_REGEX, '').trim() : '';
        return (
          <div key={i} className="animate-in slide-in-from-bottom-2 duration-500 space-y-2">
            {turn.input && (
              <div className="flex flex-col items-end">
                <div className="bg-blue-500/10 border border-blue-500/10 rounded-2xl rounded-tr-sm px-5 py-3 text-neutral-200 text-xs font-medium max-w-[90%]">
                  {turn.input}
                </div>
                <span className="text-[8px] text-neutral-600 mt-1 uppercase tracking-wider mr-1">Vous</span>
              </div>
            )}
            {displayOutput && (
              <div className="flex flex-col items-start">
                <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-sm px-5 py-3 text-neutral-300 text-xs leading-relaxed max-w-[90%]">
                  {displayOutput}
                </div>
                <span className="text-[8px] text-neutral-600 mt-1 uppercase tracking-wider ml-1">Agent Vestee</span>
              </div>
            )}
          </div>
        );
      })}
      {(realtimeInput || realtimeOutput) && (
        <div className="animate-pulse space-y-2">
          {realtimeInput && (
            <div className="flex flex-col items-end">
              <div className="bg-blue-500/5 border border-blue-500/5 rounded-2xl rounded-tr-sm px-5 py-3 text-neutral-400 text-xs font-medium max-w-[90%] italic">
                {realtimeInput}
              </div>
            </div>
          )}
          {realtimeOutput && (
            <div className="flex flex-col items-start">
              <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-sm px-5 py-3 text-neutral-400 text-xs leading-relaxed max-w-[90%]">
                {realtimeOutput.replace(CONTEXT_UPDATE_REGEX, '')}
              </div>
            </div>
          )}
        </div>
      )}
      <div ref={endRef} />
    </>
  );
};

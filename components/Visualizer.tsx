
import React from 'react';

interface VisualizerProps {
  level: number; // 0 to 1
  color: string;
  label: string;
}

export const Visualizer: React.FC<VisualizerProps> = ({ level, color, label }) => {
  const safeLevel = Math.max(0, Math.min(1, level));
  const segments = 12; // Réduit de 20 à 12 pour plus de compacité
  const activeSegments = Math.floor(safeLevel * segments);
  
  return (
    <div className="flex flex-col gap-0.5 w-full max-w-[80px]"> {/* Largeur réduite */}
      <div className="flex justify-between items-center">
        <span className="text-[7px] font-black uppercase tracking-widest text-black/40">{label}</span>
      </div>
      <div className="flex gap-[1px] h-1.5 w-full bg-black/5 rounded-sm overflow-hidden p-[0.5px]"> {/* Hauteur réduite */}
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className="flex-1 transition-all duration-75"
            style={{
              backgroundColor: i < activeSegments ? color : 'transparent',
              opacity: i < activeSegments ? 1 : 0.05,
            }}
          />
        ))}
      </div>
    </div>
  );
};

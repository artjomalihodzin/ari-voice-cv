import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isAiSpeaking: boolean;
  isListening: boolean;
  isConnected: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  analyser,
  isAiSpeaking,
  isListening,
  isConnected,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let phase = 0;

    const bufferLength = analyser ? analyser.frequencyBinCount : 64;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationId = requestAnimationFrame(render);

      // Handle retina displays
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Get frequency or time data if active
      let avgLevel = 0;
      if (analyser && (isAiSpeaking || isListening)) {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < 32; i++) {
          sum += dataArray[i];
        }
        avgLevel = sum / (32 * 255);
      }

      phase += isAiSpeaking ? 0.08 + avgLevel * 0.1 : isListening ? 0.04 : 0.02;

      const centerY = height / 2;

      // Draw multi-layered glowing sine waves
      const lines = [
        {
          color: isAiSpeaking
            ? 'rgba(6, 182, 212, 0.9)' // Cyan
            : isListening
            ? 'rgba(16, 185, 129, 0.9)' // Emerald
            : 'rgba(99, 102, 241, 0.4)', // Indigo
          glow: isAiSpeaking
            ? 'rgba(6, 182, 212, 0.6)'
            : 'rgba(16, 185, 129, 0.4)',
          freq: 0.015,
          speed: phase,
          amp: (isAiSpeaking ? 28 + avgLevel * 50 : isListening ? 12 : 6),
          lineWidth: 2.5,
        },
        {
          color: isAiSpeaking
            ? 'rgba(168, 85, 247, 0.8)' // Violet
            : isListening
            ? 'rgba(52, 211, 153, 0.7)'
            : 'rgba(139, 92, 246, 0.3)',
          glow: 'rgba(168, 85, 247, 0.4)',
          freq: 0.025,
          speed: phase * 1.3 + 1,
          amp: (isAiSpeaking ? 22 + avgLevel * 40 : isListening ? 8 : 4),
          lineWidth: 2,
        },
        {
          color: isAiSpeaking
            ? 'rgba(56, 189, 248, 0.7)' // Sky blue
            : isListening
            ? 'rgba(110, 231, 183, 0.5)'
            : 'rgba(99, 102, 241, 0.25)',
          glow: 'rgba(56, 189, 248, 0.3)',
          freq: 0.035,
          speed: phase * 0.8 + 2,
          amp: (isAiSpeaking ? 16 + avgLevel * 30 : isListening ? 6 : 3),
          lineWidth: 1.5,
        },
      ];

      for (const line of lines) {
        ctx.beginPath();
        ctx.strokeStyle = line.color;
        ctx.lineWidth = line.lineWidth;
        ctx.shadowBlur = isAiSpeaking ? 14 : isListening ? 8 : 4;
        ctx.shadowColor = line.glow;

        for (let x = 0; x <= width; x += 3) {
          // Windowing envelope so wave tapers gracefully at edges
          const envelope = Math.sin((x / width) * Math.PI);
          // Wave equation
          const y =
            centerY +
            Math.sin(x * line.freq + line.speed) *
              line.amp *
              envelope;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // If AI is speaking, render dynamic center energy equalizer bars
      if (isAiSpeaking && analyser) {
        const barCount = 28;
        const totalBarWidth = width * 0.55;
        const barSpacing = totalBarWidth / barCount;
        const startX = (width - totalBarWidth) / 2;

        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(6, 182, 212, 0.7)';

        for (let i = 0; i < barCount; i++) {
          const sampleIndex = Math.floor((i / barCount) * 40);
          const rawVal = dataArray[sampleIndex] || 0;
          const barHeight = Math.max(3, (rawVal / 255) * 44);

          const bx = startX + i * barSpacing;
          const by = centerY - barHeight / 2;

          const grad = ctx.createLinearGradient(bx, by, bx, by + barHeight);
          grad.addColorStop(0, 'rgba(56, 189, 248, 0.9)');
          grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.8)');
          grad.addColorStop(1, 'rgba(6, 182, 212, 0.9)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(bx, by, Math.max(2, barSpacing * 0.45), barHeight, 2);
          ctx.fill();
        }
      }

      ctx.restore();
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [analyser, isAiSpeaking, isListening, isConnected]);

  return (
    <div className="relative w-full h-24 sm:h-28 overflow-hidden rounded-2xl bg-neutral-900/40 border border-neutral-800/60 backdrop-blur-md flex items-center justify-center">
      <canvas ref={canvasRef} className="w-full h-full" />
      {!isConnected && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest px-3 py-1 bg-neutral-950/70 border border-neutral-800/80 rounded-full">
            Voice Agent Standby
          </span>
        </div>
      )}
    </div>
  );
};

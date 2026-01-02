import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WaveformPlayerProps {
  audioUrl: string;
  onRegionUpdate?: (start: number, end: number) => void;
  enableRegionSelect?: boolean;
  fixedDuration?: number;
}

export const WaveformPlayer = ({ audioUrl, onRegionUpdate, enableRegionSelect = false, fixedDuration }: WaveformPlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'hsl(var(--muted))',
      progressColor: 'hsl(var(--primary))',
      cursorColor: 'hsl(var(--accent))',
      barWidth: 2,
      barRadius: 3,
      cursorWidth: 2,
      height: 128,
      barGap: 2,
    });

    if (enableRegionSelect) {
      const regions = ws.registerPlugin(RegionsPlugin.create());
      regionsRef.current = regions;

      regions.on('region-updated', (region: any) => {
        onRegionUpdate?.(region.start, region.end);
      });

      ws.on('ready', () => {
        const duration = ws.getDuration();
        const regionDuration = fixedDuration || Math.min(60, duration);
        const defaultStart = 0;
        const defaultEnd = Math.min(regionDuration, duration);
        
        regions.addRegion({
          start: defaultStart,
          end: defaultEnd,
          color: 'hsla(180, 75%, 55%, 0.2)',
          drag: true,
          resize: fixedDuration ? false : true, // Disable resize if fixed duration
        });
        
        onRegionUpdate?.(defaultStart, defaultEnd);
      });
    }

    ws.load(audioUrl);

    ws.on('ready', () => {
      setIsReady(true);
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));

    wavesurferRef.current = ws;

    return () => {
      ws.destroy();
    };
  }, [audioUrl, enableRegionSelect, onRegionUpdate, fixedDuration]);

  const handlePlayPause = () => {
    wavesurferRef.current?.playPause();
  };

  const handleReset = () => {
    wavesurferRef.current?.seekTo(0);
    wavesurferRef.current?.pause();
  };

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="rounded-lg bg-card/50 p-4" />
      
      {isReady && (
        <div className="flex items-center gap-3">
          <Button onClick={handlePlayPause} size="lg" className="gap-2">
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          
          <Button onClick={handleReset} variant="outline" size="lg" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      )}
    </div>
  );
};

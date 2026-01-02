import { useState, useRef } from 'react';
import { Mic, Square, Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
}

export const AudioRecorder = ({ onRecordingComplete }: AudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        onRecordingComplete(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast.success('Recording started');
    } catch (error) {
      toast.error('Failed to access microphone');
      console.error(error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      toast.success('Recording stopped');
    }
  };

  const playRecording = () => {
    if (recordedBlob && !isPlaying) {
      const url = URL.createObjectURL(recordedBlob);
      const audio = new Audio(url);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsPlaying(false);
      };
      
      audio.play();
      setIsPlaying(true);
    } else if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const resetRecording = () => {
    setRecordedBlob(null);
    setIsPlaying(false);
    setRecordingTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-card border border-border p-8">
        <div className="flex flex-col items-center gap-6">
          {/* Recording indicator */}
          <div className="relative">
            <div className={`h-24 w-24 rounded-full flex items-center justify-center transition-all ${
              isRecording ? 'bg-destructive/20 animate-pulse' : 'bg-primary/20'
            }`}>
              <Mic className={`h-12 w-12 ${isRecording ? 'text-destructive' : 'text-primary'}`} />
            </div>
            {isRecording && (
              <div className="absolute -top-2 -right-2 h-6 w-6 bg-destructive rounded-full animate-pulse" />
            )}
          </div>

          {/* Timer */}
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground">
              {formatTime(recordingTime)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {isRecording ? 'Recording...' : recordedBlob ? 'Recording complete' : 'Ready to record'}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {!isRecording && !recordedBlob && (
              <Button onClick={startRecording} size="lg" className="gap-2">
                <Mic className="h-5 w-5" />
                Start Recording
              </Button>
            )}

            {isRecording && (
              <Button onClick={stopRecording} variant="destructive" size="lg" className="gap-2">
                <Square className="h-5 w-5" />
                Stop Recording
              </Button>
            )}

            {recordedBlob && !isRecording && (
              <>
                <Button onClick={playRecording} size="lg" className="gap-2">
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  {isPlaying ? 'Pause' : 'Play Recording'}
                </Button>
                
                <Button onClick={resetRecording} variant="outline" size="lg" className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Re-record
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { WaveformPlayer } from '@/components/WaveformPlayer';
import { Button } from '@/components/ui/button';
import { Scissors, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/services/api';

const SelectSegment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { fileId, fileName } = location.state || {};

  const [audioUrl, setAudioUrl] = useState<string>('');
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(60);

  useEffect(() => {
    if (!fileId) {
      navigate('/');
      return;
    }

    // Fetch the audio file URL from the backend
    setAudioUrl(`${API_BASE_URL}/files/${fileId}`);
  }, [fileId, navigate]);

  const handleRegionUpdate = (start: number, end: number) => {
    setStartTime(start);
    setEndTime(end);
  };

  const handleProcessSegment = async () => {
    const duration = endTime - startTime;

    if (duration < 30) {
      toast.error('Segment must be at least 30 seconds long');
      return;
    }

    if (duration > 120) {
      toast.error('Segment must be no longer than 2 minutes');
      return;
    }

    // Since the segment was already created during upload, just navigate to recording
    toast.success('Segment selected successfully!');
    navigate('/record', {
      state: {
        segmentId: fileId, // This is the segment ID created during upload
        fileName,
        startTime,
        endTime,
      },
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gradient mb-2">Select Practice Segment</h1>
            <p className="text-muted-foreground">
              Choose a 30 second to 2 minute section of the song to practice
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-gradient-card p-8 space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Scissors className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-semibold">Song: {fileName}</h2>
              </div>

              {audioUrl && (
                <WaveformPlayer
                  audioUrl={audioUrl}
                  onRegionUpdate={handleRegionUpdate}
                  enableRegionSelect={true}
                />
              )}
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border">
              <div className="flex gap-8">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Start Time</p>
                  <p className="text-xl font-bold text-primary">{formatTime(startTime)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">End Time</p>
                  <p className="text-xl font-bold text-primary">{formatTime(endTime)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Duration</p>
                  <p className="text-xl font-bold text-foreground">
                    {formatTime(endTime - startTime)}
                  </p>
                </div>
              </div>

              <Button
                onClick={handleProcessSegment}
                size="lg"
                className="gap-2"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SelectSegment;

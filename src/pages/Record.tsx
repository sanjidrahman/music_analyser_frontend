import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { AudioRecorder } from '@/components/AudioRecorder';
import { Button } from '@/components/ui/button';
import { Mic, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { recordingAPI, analysisAPI } from '@/services/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const Record = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Get segment info from location state or localStorage as fallback
  const getSegmentInfo = () => {
    // Try to get from location state first
    if (location.state?.segmentId) {
      return location.state;
    }

    // Fallback to localStorage
    try {
      const stored = localStorage.getItem('currentSegment');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error parsing stored segment info:', error);
    }

    return {};
  };

  const segmentInfo = getSegmentInfo();
  const { segmentId, fileName, startTime, endTime } = segmentInfo;

  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  // Redirect if no segment info is available
  useEffect(() => {
    if (!segmentId) {
      toast.error('No segment information found. Please upload a song first.');
      navigate('/');
    }
  }, [segmentId, navigate]);

  // Clean up localStorage when component unmounts (user navigates away)
  useEffect(() => {
    return () => {
      // Clean up localStorage when user navigates away (unless analysis is in progress)
      // This prevents stale data if user uploads a new segment later
      if (!isAnalyzing) {
        localStorage.removeItem('currentSegment');
      }
    };
  }, [isAnalyzing]);

  const handleRecordingComplete = (blob: Blob) => {
    setRecordedBlob(blob);
  };

  const handleSubmitAnalysis = async () => {
    if (!user) {
      setShowLoginDialog(true);
      return;
    }

    if (!recordedBlob) {
      toast.error('Please record your singing first');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Ensure segmentId is a number
      const segmentIdNum = parseInt(segmentId.toString());
      if (isNaN(segmentIdNum)) {
        throw new Error('Invalid segment ID');
      }

      // Convert blob to File for upload
      const audioFile = new File([recordedBlob], 'recording.webm', { type: 'audio/webm' });

      // First upload the recording
      const recordingData = await recordingAPI.uploadRecording(audioFile, segmentIdNum);

      // Then analyze it against the segment
      const analysisData = await analysisAPI.analyzeRecording(segmentIdNum.toString(), recordingData.id.toString());

      // Clean up localStorage since we're done with this segment
      localStorage.removeItem('currentSegment');

      toast.success('Analysis complete!');
      navigate(`/results/${analysisData.id}`);
    } catch (error) {
      toast.error('Failed to analyze recording');
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
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
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gradient mb-2">Record Your Performance</h1>
            <p className="text-muted-foreground">
              Sing along with the selected segment and we'll analyze your performance
            </p>
          </div>

          <div className="space-y-6">
            {/* Segment Info */}
            <div className="rounded-xl border border-border bg-gradient-card p-6">
              <h3 className="font-semibold mb-4">Practice Segment</h3>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-muted-foreground">Song</p>
                  <p className="font-medium">{fileName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-medium">
                    {formatTime(startTime)} - {formatTime(endTime)}
                  </p>
                </div>
              </div>
            </div>

            {/* Recorder */}
            <div className="rounded-xl border border-border bg-gradient-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <Mic className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-semibold">Your Recording</h2>
              </div>

              <AudioRecorder onRecordingComplete={handleRecordingComplete} />
            </div>

            {/* Submit Button */}
            {recordedBlob && (
              <Button
                onClick={handleSubmitAnalysis}
                disabled={isAnalyzing}
                size="lg"
                className="w-full gap-2"
              >
                {isAnalyzing ? 'Analyzing...' : 'Submit for Analysis'}
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* Login Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login Required</DialogTitle>
            <DialogDescription>
              You need to be logged in to submit your recording for analysis.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/login')}
              className="flex-1"
            >
              Login
            </Button>
            <Button
              onClick={() => navigate('/register')}
              variant="outline"
              className="flex-1"
            >
              Sign Up
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Record;

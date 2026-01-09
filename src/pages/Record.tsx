import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { AudioRecorder } from '@/components/AudioRecorder';
import { FileUpload } from '@/components/FileUpload';
import { WaveformPlayer } from '@/components/WaveformPlayer';
import { Button } from '@/components/ui/button';
import { Mic, Send, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { recordingAPI, analysisAPI, uploadAPI } from '@/services/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

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

  const [mode, setMode] = useState<'record' | 'upload'>('record');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [segmentStart, setSegmentStart] = useState<number>(0);
  const [segmentEnd, setSegmentEnd] = useState<number>(30);
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

  const handleFileSelect = (file: File) => {
    setUploadedFile(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    // Reset segment selection when new file is uploaded
    setSegmentStart(0);
    setSegmentEnd(selectedDuration);
  };

  const handleDurationSelect = (duration: number) => {
    setSelectedDuration(duration);
    setSegmentStart(0);
    setSegmentEnd(duration);
  };

  const handleRegionUpdate = useCallback((start: number, end: number) => {
    setSegmentStart(start);
    setSegmentEnd(end);
  }, []);

  const handleSubmitAnalysis = async () => {
    if (!user) {
      setShowLoginDialog(true);
      return;
    }

    if (mode === 'record' && !recordedBlob) {
      toast.error('Please record your singing first');
      return;
    }

    if (mode === 'upload' && !uploadedFile) {
      toast.error('Please upload an audio file first');
      return;
    }

    setIsAnalyzing(true);
    try {
      const segmentIdNum = parseInt(segmentId.toString());
      if (isNaN(segmentIdNum)) {
        throw new Error('Invalid segment ID');
      }

      if (mode === 'record') {
        // Live recording flow - full recording without segment extraction
        const audioFile = new File([recordedBlob!], 'recording.webm', { type: 'audio/webm' });
        const recordingData = await recordingAPI.uploadRecording(audioFile, segmentIdNum, 'recording');
        const analysisData = await analysisAPI.analyzeRecording(segmentIdNum.toString(), recordingData.id.toString());

        localStorage.removeItem('currentSegment');
        toast.success('Analysis complete!');
        navigate(`/results/${analysisData.id}`);
      } else {
        // Upload pre-recorded file flow - with segment extraction
        const audioFile = new File([uploadedFile!], uploadedFile!.name, { type: uploadedFile!.type });

        // Upload the pre-recorded file with segment timing info for extraction
        const recordingData = await recordingAPI.uploadRecording(audioFile, segmentIdNum, 'recording', segmentStart, segmentEnd);
        const analysisData = await analysisAPI.analyzeRecording(segmentIdNum.toString(), recordingData.id.toString());

        localStorage.removeItem('currentSegment');
        toast.success('Analysis complete!');
        navigate(`/results/${analysisData.id}`);
      }
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
            <h1 className="text-3xl font-bold text-gradient mb-2">
              {mode === 'record' ? 'Record Your Performance' : 'Upload Your Recording'}
            </h1>
            <p className="text-muted-foreground">
              {mode === 'record'
                ? 'Sing along with the selected segment and we\'ll analyze your performance'
                : 'Upload your pre-recorded singing and select which part to analyze'}
            </p>
          </div>

          <div className="space-y-6">
            {/* Mode Toggle */}
            <div className="rounded-xl border border-border bg-gradient-card p-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMode('record')}
                  className={cn(
                    'flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all',
                    mode === 'record'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <Mic className="h-4 w-4" />
                  Record
                </button>
                <button
                  onClick={() => setMode('upload')}
                  className={cn(
                    'flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all',
                    mode === 'upload'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <Upload className="h-4 w-4" />
                  Upload
                </button>
              </div>
            </div>

            {mode === 'record' ? (
              <>
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
              </>
            ) : (
              <>
                {/* Practice Segment Info */}
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

                {/* File Upload */}
                <div className="rounded-xl border border-border bg-gradient-card p-6">
                  <FileUpload
                    onFileSelect={handleFileSelect}
                    accept="audio/wav,audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/flac,audio/ogg,audio/webm"
                    maxSize={50 * 1024 * 1024}
                    supportedFormatsText="WAV, MP3, M4A, FLAC, OGG, WEBM (max 50MB)"
                  />
                </div>

                {/* Duration Selection and Waveform */}
                {uploadedFile && audioUrl && (
                  <>
                    {/* Duration Selection */}
                    <div className="rounded-xl border border-border bg-gradient-card p-6">
                      <h3 className="font-semibold mb-4">Select Duration</h3>
                      <div className="grid grid-cols-3 gap-3">
                        <Button
                          variant={selectedDuration === 15 ? 'default' : 'outline'}
                          onClick={() => handleDurationSelect(15)}
                          className="w-full"
                        >
                          15 seconds
                        </Button>
                        <Button
                          variant={selectedDuration === 30 ? 'default' : 'outline'}
                          onClick={() => handleDurationSelect(30)}
                          className="w-full"
                        >
                          30 seconds
                        </Button>
                        <Button
                          variant={selectedDuration === 60 ? 'default' : 'outline'}
                          onClick={() => handleDurationSelect(60)}
                          className="w-full"
                        >
                          1 minute
                        </Button>
                      </div>
                    </div>

                    {/* Waveform and Segment Selection */}
                    <div className="rounded-xl border border-border bg-gradient-card p-6">
                      <h3 className="font-semibold mb-4">Select Segment to Analyze</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Drag the highlighted region to select which part of your recording to analyze
                      </p>
                      <WaveformPlayer
                        audioUrl={audioUrl}
                        enableRegionSelect={true}
                        onRegionUpdate={handleRegionUpdate}
                        fixedDuration={selectedDuration}
                      />
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <div>
                          <p className="text-muted-foreground">Selected Segment</p>
                          <p className="font-medium">
                            {formatTime(segmentStart)} - {formatTime(segmentEnd)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">File</p>
                          <p className="font-medium truncate max-w-[200px]">{uploadedFile.name}</p>
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                      onClick={handleSubmitAnalysis}
                      disabled={isAnalyzing}
                      size="lg"
                      className="w-full gap-2"
                    >
                      {isAnalyzing ? 'Analyzing...' : 'Submit for Analysis'}
                      <Send className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </>
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

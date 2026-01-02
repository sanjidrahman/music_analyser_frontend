import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUpload } from '@/components/FileUpload';
import { WaveformPlayer } from '@/components/WaveformPlayer';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Music, Target, TrendingUp, Award, Upload, ListMusic } from 'lucide-react';
import { toast } from 'sonner';
import { uploadAPI, segmentsAPI } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [hasSegments, setHasSegments] = useState(false);
  const [isLoadingSegments, setIsLoadingSegments] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchSegments();
    } else {
      setHasSegments(false);
      setIsLoadingSegments(false);
    }
  }, [user]);

  const fetchSegments = async () => {
    try {
      const data = await segmentsAPI.getSegments();
      const segments = Array.isArray(data) ? data : [];
      setHasSegments(segments.length > 0);
    } catch (error) {
      console.error('Failed to fetch segments:', error);
      setHasSegments(false);
    } finally {
      setIsLoadingSegments(false);
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setSelectedDuration(null);
    setStartTime(0);
    setEndTime(0);
    toast.success('File selected! Now choose a segment duration.');
  };

  const handleDurationSelect = (duration: number) => {
    setSelectedDuration(duration);
    setEndTime(duration);
  };

  const handleRegionUpdate = useCallback((start: number, end: number) => {
    setStartTime(start);
    setEndTime(end);
  }, []);

  // Helper function to format time with proper precision
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${parseFloat(secs) < 10 ? '0' + secs : secs}`;
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedDuration) return;

    // Calculate actual duration with tolerance for floating point precision
    const actualDuration = Math.abs(endTime - startTime);
    const tolerance = 0.1; // 100ms tolerance
    const isDurationValid = Math.abs(actualDuration - selectedDuration) <= tolerance;

    if (!isDurationValid) {
      toast.error(`Please ensure the segment is exactly ${selectedDuration} seconds (current: ${actualDuration.toFixed(1)}s)`);
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadAPI.uploadAndProcess(selectedFile, startTime, endTime);
      toast.success('Song uploaded and processed!');
      
      // Clean up the local URL
      URL.revokeObjectURL(audioUrl);

      // Store segment info in localStorage for persistence
      const segmentInfo = {
        segmentId: result.id,
        fileName: selectedFile.name,
        startTime,
        endTime,
      };
      localStorage.setItem('currentSegment', JSON.stringify(segmentInfo));

      navigate('/record', {
        state: segmentInfo,
      });
    } catch (error) {
      toast.error('Upload failed. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">
            <span className="text-gradient">Master Your Voice</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Upload a song, practice singing, and get instant AI-powered feedback
            to improve your vocal skills
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="rounded-xl border border-border bg-gradient-card p-6 text-center">
            <div className="mx-auto w-fit rounded-full bg-primary/20 p-3 mb-4">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Precise Analysis</h3>
            <p className="text-sm text-muted-foreground">
              Get detailed feedback on pitch, rhythm, tone, and timing accuracy
            </p>
          </div>

          <div className="rounded-xl border border-border bg-gradient-card p-6 text-center">
            <div className="mx-auto w-fit rounded-full bg-accent/20 p-3 mb-4">
              <TrendingUp className="h-6 w-6 text-accent" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Track Progress</h3>
            <p className="text-sm text-muted-foreground">
              Monitor your improvement over time with detailed history and stats
            </p>
          </div>

          <div className="rounded-xl border border-border bg-gradient-card p-6 text-center">
            <div className="mx-auto w-fit rounded-full bg-success/20 p-3 mb-4">
              <Award className="h-6 w-6 text-success" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Achieve Goals</h3>
            <p className="text-sm text-muted-foreground">
              Practice specific sections and master challenging parts of songs
            </p>
          </div>
        </div>

        {/* Choose from segments link - only show if user has segments */}
        <div className="text-center mb-12">
          {!isLoadingSegments && hasSegments && (
            <div className="mt-8">
              <Button
                onClick={() => navigate("/my-segments")}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <ListMusic className="h-5 w-5" />
                Choose from My Segments
              </Button>
            </div>
          )}
        </div>

        {/* Upload Section */}
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-border bg-gradient-card p-8">
            <div className="flex items-center gap-3 mb-6">
              <Music className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Upload Your Song</h2>
            </div>

            <FileUpload onFileSelect={handleFileSelect} />

            {selectedFile && (
              <div className="mt-6 space-y-6">
                <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <Music className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Select Segment Duration
                  </h3>
                  <div className="flex gap-3 mb-6">
                    <Button
                      onClick={() => handleDurationSelect(15)}
                      variant={selectedDuration === 15 ? "default" : "outline"}
                      size="lg"
                    >
                      15 seconds
                    </Button>
                    <Button
                      onClick={() => handleDurationSelect(30)}
                      variant={selectedDuration === 30 ? "default" : "outline"}
                      size="lg"
                    >
                      30 seconds
                    </Button>
                    <Button
                      onClick={() => handleDurationSelect(60)}
                      variant={selectedDuration === 60 ? "default" : "outline"}
                      size="lg"
                    >
                      1 minute
                    </Button>
                  </div>

                  {selectedDuration && audioUrl && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Drag the highlighted region to select where in the song
                        you want to practice
                      </p>
                      <WaveformPlayer
                        audioUrl={audioUrl}
                        onRegionUpdate={handleRegionUpdate}
                        enableRegionSelect={true}
                        fixedDuration={selectedDuration}
                      />
                      <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border">
                        <div className="flex gap-8">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">
                              Start Time
                            </p>
                            <p className="text-lg font-bold text-primary">
                              {formatTime(startTime)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">
                              End Time
                            </p>
                            <p className="text-lg font-bold text-primary">
                              {formatTime(endTime)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">
                              Duration
                            </p>
                            <p className="text-lg font-bold text-foreground">
                              {Math.abs(endTime - startTime).toFixed(1)}s
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={handleUpload}
                          disabled={isUploading}
                          size="lg"
                          className="gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          {isUploading ? "Uploading..." : "Upload & Continue"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;

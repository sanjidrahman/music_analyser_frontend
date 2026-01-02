import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Award, RotateCcw, History, TrendingUp, Music2, Clock, Target, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';
import { resultsAPI, segmentsAPI, recordingAPI, API_BASE_URL } from '@/services/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface PitchDataPoint {
  time: number;
  ref_pitch: number;
  user_pitch: number;
  difference_semitones: number;
}

interface DetailedAnalysis {
  pitch: {
    similarity: number;
    notes_matched: number;
    notes_total: number;
    pitch_over_time: PitchDataPoint[];
  };
  rhythm: {
    similarity: number;
    tempo_difference: number;
    beat_alignment: number;
    ref_tempo: number;
    user_tempo: number;
  };
  timbre: {
    similarity: number;
  };
  timing: {
    similarity: number;
    ref_duration: number;
    user_duration: number;
    duration_difference: number;
  };
}

interface AttemptResult {
  id: number;
  user_id: number;
  segment_id: number;
  recording_id: number;
  overall_score: number;
  pitch_accuracy: number;
  rhythm_accuracy: number;
  tone_similarity: number;
  timing_accuracy: number;
  detailed_analysis: DetailedAnalysis;
  analysis_version: string;
  created_at: string;
}

interface SegmentInfo {
  id: number;
  original_filename: string;
  file_path: string;
  vocal_file_path: string;
  duration: number;
}

interface RecordingInfo {
  id: number;
  file_path: string;
}

const Results = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState<AttemptResult | null>(null);
  const [segment, setSegment] = useState<SegmentInfo | null>(null);
  const [recording, setRecording] = useState<RecordingInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [playingSegment, setPlayingSegment] = useState(false);
  const [playingRecording, setPlayingRecording] = useState(false);
  const [segmentAudio, setSegmentAudio] = useState<HTMLAudioElement | null>(null);
  const [recordingAudio, setRecordingAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const data = await resultsAPI.getResults(attemptId!);
        setResults(data);

        // Fetch segment and recording details
        const [segmentData, recordingData] = await Promise.all([
          segmentsAPI.getSegment(data.segment_id.toString()),
          recordingAPI.getRecordingDetails(data.recording_id.toString()),
        ]);
        setSegment(segmentData);
        setRecording(recordingData);
      } catch (error) {
        toast.error('Failed to load results');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [attemptId]);

  useEffect(() => {
    // Cleanup audio on unmount
    return () => {
      segmentAudio?.pause();
      recordingAudio?.pause();
    };
  }, [segmentAudio, recordingAudio]);

  const getAudioUrl = (filePath: string) => {
    const cleanPath = filePath.replace(/^\.\/?storage\//, '');
    return `${API_BASE_URL}/api/audio/${encodeURIComponent(cleanPath)}`;
  };

  const toggleSegmentPlay = () => {
    if (!segment) return;

    if (playingSegment) {
      segmentAudio?.pause();
      setPlayingSegment(false);
    } else {
      // Stop recording if playing
      if (playingRecording) {
        recordingAudio?.pause();
        setPlayingRecording(false);
      }

      const audio = new Audio(getAudioUrl(segment.vocal_file_path || segment.file_path));
      audio.onended = () => setPlayingSegment(false);
      audio.play();
      setSegmentAudio(audio);
      setPlayingSegment(true);
    }
  };

  const toggleRecordingPlay = () => {
    if (!recording) return;

    if (playingRecording) {
      recordingAudio?.pause();
      setPlayingRecording(false);
    } else {
      // Stop segment if playing
      if (playingSegment) {
        segmentAudio?.pause();
        setPlayingSegment(false);
      }

      const audio = new Audio(getAudioUrl(recording.file_path));
      audio.onended = () => setPlayingRecording(false);
      audio.play();
      setRecordingAudio(audio);
      setPlayingRecording(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <p className="text-muted-foreground">Results not found</p>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  // Prepare pitch data for chart
  const pitchChartData = results.detailed_analysis?.pitch?.pitch_over_time?.map((point) => ({
    time: point.time.toFixed(2),
    'Reference Pitch': Math.round(point.ref_pitch),
    'Your Pitch': Math.round(point.user_pitch),
  })) || [];

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gradient mb-2">Performance Analysis</h1>
            {segment && <p className="text-muted-foreground">{segment.original_filename}</p>}
          </div>

          {/* Audio Players */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border bg-gradient-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold mb-1">Original Segment</h3>
                  {segment && (
                    <p className="text-sm text-muted-foreground">
                      {segment.duration?.toFixed(1)}s
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleSegmentPlay}
                  disabled={!segment}
                >
                  {playingSegment ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-gradient-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold mb-1">Your Recording</h3>
                  {results.detailed_analysis?.timing && (
                    <p className="text-sm text-muted-foreground">
                      {results.detailed_analysis.timing.user_duration?.toFixed(1)}s
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleRecordingPlay}
                  disabled={!recording}
                >
                  {playingRecording ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Overall Score */}
          <div className="rounded-2xl border border-border bg-gradient-primary p-12 text-center">
            <div className="flex justify-center mb-4">
              <Award className="h-16 w-16 text-foreground" />
            </div>
            <div className="text-7xl font-bold text-foreground mb-2">
              {results.overall_score.toFixed(1)}
            </div>
            <p className="text-xl text-foreground/80">Overall Score</p>
          </div>

          {/* Score Breakdown */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border bg-gradient-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Music2 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Pitch Accuracy</h3>
              </div>
              <div className={`text-4xl font-bold ${getScoreColor(results.pitch_accuracy)}`}>
                {results.pitch_accuracy.toFixed(1)}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-gradient-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Rhythm Accuracy</h3>
              </div>
              <div className={`text-4xl font-bold ${getScoreColor(results.rhythm_accuracy)}`}>
                {results.rhythm_accuracy.toFixed(1)}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-gradient-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Target className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Tone Similarity</h3>
              </div>
              <div className={`text-4xl font-bold ${getScoreColor(results.tone_similarity)}`}>
                {results.tone_similarity.toFixed(1)}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-gradient-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Timing Accuracy</h3>
              </div>
              <div className={`text-4xl font-bold ${getScoreColor(results.timing_accuracy)}`}>
                {results.timing_accuracy.toFixed(1)}
              </div>
            </div>
          </div>

          {/* Pitch Comparison Chart */}
          {pitchChartData.length > 0 && (
            <div className="rounded-xl border border-border bg-gradient-card p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-semibold">Pitch Comparison Over Time</h3>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-1 rounded-full bg-primary" />
                    <span className="text-muted-foreground">Reference</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-1 rounded-full" style={{ backgroundColor: 'hsl(280, 70%, 60%)' }} />
                    <span className="text-muted-foreground">Your Pitch</span>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={pitchChartData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                  <defs>
                    <linearGradient id="refPitchGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="userPitchGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(280, 70%, 60%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(280, 70%, 60%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="hsl(var(--border))" 
                    opacity={0.5}
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="time" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    label={{ value: 'Time (seconds)', position: 'insideBottom', offset: -15, fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickMargin={10}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    label={{ value: 'Pitch (Hz)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickMargin={10}
                    domain={['dataMin - 20', 'dataMax + 20']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.75rem',
                      padding: '12px 16px',
                      boxShadow: '0 10px 40px -10px hsl(var(--primary) / 0.2)',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: '8px' }}
                    itemStyle={{ padding: '2px 0' }}
                    formatter={(value: number) => [`${value} Hz`, '']}
                    labelFormatter={(label) => `Time: ${label}s`}
                  />
                  <Line
                    type="monotone"
                    dataKey="Reference Pitch"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 2, fill: 'hsl(var(--background))' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Your Pitch"
                    stroke="hsl(280, 70%, 60%)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 2, fill: 'hsl(var(--background))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Detailed Stats */}
          <div className="rounded-xl border border-border bg-gradient-card p-6">
            <h3 className="font-semibold mb-4">Detailed Statistics</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Notes Matched</p>
                <p className="text-2xl font-bold">
                  {results.detailed_analysis?.pitch?.notes_matched || 0} / {results.detailed_analysis?.pitch?.notes_total || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Tempo Difference</p>
                <p className="text-2xl font-bold">
                  {results.detailed_analysis?.rhythm?.tempo_difference?.toFixed(1) || 0} BPM
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Duration Difference</p>
                <p className="text-2xl font-bold">
                  {results.detailed_analysis?.timing?.duration_difference?.toFixed(1) || 0}s
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 justify-center">
            <Button onClick={() => navigate('/')} size="lg" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Try Another Song
            </Button>
            <Button onClick={() => navigate('/history')} variant="outline" size="lg" className="gap-2">
              <History className="h-4 w-4" />
              View History
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Results;

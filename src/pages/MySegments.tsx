import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Music, Clock, Calendar, Trash2, Play, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { segmentsAPI, API_BASE_URL } from '@/services/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Segment {
  id: number;
  user_id: number;
  file_path: string;
  vocal_file_path: string;
  duration: number;
  start_time: number;
  end_time: number;
  original_filename: string;
  file_format: string;
  sample_rate: number;
  channels: number;
  created_at: string;
  expires_at: string;
}

const MySegments = () => {
  const navigate = useNavigate();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchSegments();
  }, []);

  const fetchSegments = async () => {
    try {
      setIsLoading(true);
      const data = await segmentsAPI.getSegments();
      setSegments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch segments:', error);
      toast.error('Failed to load segments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSegment = (segment: Segment) => {
    const segmentInfo = {
      segmentId: segment.id,
      fileName: segment.original_filename,
      startTime: segment.start_time,
      endTime: segment.end_time,
    };
    localStorage.setItem('currentSegment', JSON.stringify(segmentInfo));
    navigate('/record', { state: segmentInfo });
  };

  const handleDeleteSegment = async (segmentId: number) => {
    try {
      setDeletingId(segmentId);
      await segmentsAPI.deleteSegment(segmentId.toString());
      setSegments(segments.filter(s => s.id !== segmentId));
      toast.success('Segment deleted successfully');
    } catch (error) {
      console.error('Failed to delete segment:', error);
      toast.error('Failed to delete segment');
    } finally {
      setDeletingId(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isExpiringSoon = (expiresAt: string) => {
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const daysUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry <= 2;
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gradient mb-2">My Segments</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Select an existing segment to practice or upload a new song
              </p>
            </div>
            <Button onClick={() => navigate('/')} className="gap-2 w-full sm:w-auto">
              <Music className="h-4 w-4" />
              Upload New
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : segments.length === 0 ? (
            <Card className="bg-gradient-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Music className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No segments yet</h3>
                <p className="text-muted-foreground text-center mb-6">
                  Upload a song and create your first practice segment
                </p>
                <Button onClick={() => navigate('/')}>Upload Song</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {segments.map((segment) => (
                <Card
                  key={segment.id}
                  className="bg-gradient-card border-border hover:border-primary/50 transition-colors"
                >
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="rounded-lg bg-primary/10 p-2 sm:p-3 shrink-0">
                          <Music className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-sm sm:text-base truncate" title={segment.original_filename}>
                            {segment.original_filename}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-xs sm:text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                              {formatTime(segment.start_time)} - {formatTime(segment.end_time)} ({segment.duration}s)
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                              {formatDate(segment.created_at)}
                            </span>
                          </div>
                          {isExpiringSoon(segment.expires_at) && (
                            <p className="text-xs text-destructive mt-1">
                              Expires {formatDate(segment.expires_at)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 sm:ml-4">
                        <Button
                          onClick={() => handleSelectSegment(segment)}
                          className="gap-2 flex-1 sm:flex-auto text-sm sm:text-base"
                        >
                          <Play className="h-4 w-4" />
                          Practice
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="text-destructive hover:text-destructive shrink-0"
                              disabled={deletingId === segment.id}
                            >
                              {deletingId === segment.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Segment</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this segment? This action cannot be undone. All attempts related to this segment will also be deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteSegment(segment.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MySegments;

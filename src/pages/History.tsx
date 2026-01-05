import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { History as HistoryIcon, Trash2, TrendingUp, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { attemptsAPI } from '@/services/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Attempt {
  id: string;
  song_name: string;
  overall_score: number;
  created_at: string;
}

const History = () => {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date');

  useEffect(() => {
    fetchAttempts();
  }, []);

  const fetchAttempts = async () => {
    try {
      const data = await attemptsAPI.getUserAttempts({ limit: 100 });
      setAttempts(data);
    } catch (error) {
      toast.error('Failed to load history');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await attemptsAPI.deleteAttempt(id);
      toast.success('Attempt deleted');
      setAttempts(attempts.filter(a => a.id !== id));
    } catch (error) {
      toast.error('Failed to delete attempt');
      console.error(error);
    }
    setDeleteId(null);
  };

  const sortedAttempts = [...attempts].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return b.overall_score - a.overall_score;
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gradient mb-2">Your History</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Track your progress over time</p>
            </div>

            <div className="flex gap-2">
              <Button
                variant={sortBy === 'date' ? 'default' : 'outline'}
                onClick={() => setSortBy('date')}
                size="sm"
                className="gap-2"
              >
                <Calendar className="h-4 w-4" />
                Date
              </Button>
              <Button
                variant={sortBy === 'score' ? 'default' : 'outline'}
                onClick={() => setSortBy('score')}
                size="sm"
                className="gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                Score
              </Button>
            </div>
          </div>

          {attempts.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-border bg-gradient-card">
              <HistoryIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No attempts yet</h3>
              <p className="text-muted-foreground mb-6">
                Start practicing to see your progress here
              </p>
              <Button onClick={() => navigate('/')}>Upload a Song</Button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {sortedAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="rounded-xl border border-border bg-gradient-card p-4 sm:p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/results/${attempt.id}`)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold mb-1 truncate" title={attempt.song_name}>
                        {attempt.song_name}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {formatDate(attempt.created_at)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6">
                      <div className="text-right">
                        <p className="text-xs sm:text-sm text-muted-foreground mb-1">Score</p>
                        <p className={`text-2xl sm:text-3xl font-bold ${getScoreColor(attempt.overall_score)}`}>
                          {Number(attempt.overall_score).toFixed(1)}
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(attempt.id);
                        }}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                      >
                        <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attempt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this attempt? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default History;

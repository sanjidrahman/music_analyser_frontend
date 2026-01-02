import { useCallback, useState } from 'react';
import { Upload, Music } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
}

export const FileUpload = ({ onFileSelect, accept = 'audio/*', maxSize = 50 * 1024 * 1024 }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      if (file.size <= maxSize) {
        onFileSelect(file);
      } else {
        alert('File is too large. Maximum size is 50MB.');
      }
    }
  }, [onFileSelect, maxSize]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size <= maxSize) {
        onFileSelect(file);
      } else {
        alert('File is too large. Maximum size is 50MB.');
      }
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-all',
        isDragging
          ? 'border-primary bg-primary/5 scale-[1.02]'
          : 'border-border hover:border-primary/50 hover:bg-card/50'
      )}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="absolute inset-0 cursor-pointer opacity-0"
        id="file-upload"
      />
      
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-full bg-primary/10 p-4">
          {isDragging ? (
            <Upload className="h-8 w-8 text-primary animate-pulse" />
          ) : (
            <Music className="h-8 w-8 text-primary" />
          )}
        </div>
        
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">
            {isDragging ? 'Drop your audio file here' : 'Upload Audio File'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag and drop or click to browse
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Supported formats: MP3, WAV, OGG (max 50MB)
          </p>
        </div>
      </div>
    </div>
  );
};

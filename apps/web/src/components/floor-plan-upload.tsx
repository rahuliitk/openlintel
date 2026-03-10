'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Button,
  Progress,
  Badge,
  toast,
} from '@openlintel/ui';
import { Upload, X, FileImage } from 'lucide-react';

const ACCEPTED_EXTENSIONS = '.png,.jpg,.jpeg,.webp,.gif,.pdf,.dwg,.dxf';

interface FloorPlanUploadProps {
  projectId: string;
  disabled?: boolean;
  onUploadComplete?: (upload: Record<string, unknown>) => void;
  onDigitizationComplete?: () => void;
}

export function FloorPlanUpload({
  projectId,
  disabled,
  onUploadComplete,
}: FloorPlanUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      if (disabled) {
        setError('Please enter a name before uploading.');
        return;
      }

      const ext = file.name.split('.').pop()?.toLowerCase();
      const validExt = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'pdf', 'dwg', 'dxf'];
      if (!validExt.includes(ext ?? '')) {
        setError(`Unsupported file type. Accepted: ${validExt.join(', ')}`);
        return;
      }

      setError(null);
      setUploading(true);
      setUploadProgress(10);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);
      formData.append('category', 'floor_plan');

      try {
        setUploadProgress(30);
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        setUploadProgress(70);

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Upload failed');
        }

        const upload = await res.json();
        setUploadProgress(100);

        onUploadComplete?.(upload);
        toast({ title: 'Floor plan uploaded' });

        // Reset after short delay so progress bar shows 100%
        setTimeout(() => {
          setUploading(false);
          setUploadProgress(0);
        }, 500);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [projectId, disabled, onUploadComplete],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  };

  return (
    <div>
      <div
        className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
          disabled
            ? 'border-muted-foreground/15 opacity-50 cursor-not-allowed'
            : dragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={disabled ? (e) => e.preventDefault() : handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={handleChange}
        />

        {uploading ? (
          <div className="w-full space-y-3">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Upload className="h-4 w-4 animate-pulse" />
              Uploading...
            </div>
            <Progress value={uploadProgress} />
          </div>
        ) : (
          <>
            <FileImage className="mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="mb-1 text-sm font-medium">Upload Floor Plan</h3>
            <p className="mb-3 text-center text-sm text-muted-foreground">
              Drag and drop an image, PDF, DWG, or DXF file
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              Choose File
            </Button>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {['PNG', 'JPG', 'WEBP', 'GIF', 'PDF', 'DWG', 'DXF'].map((ext) => (
                <Badge key={ext} variant="secondary" className="text-xs">
                  {ext}
                </Badge>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Max file size: 50MB
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-2 flex items-center gap-1 text-sm text-destructive">
          <X className="h-3 w-3" />
          {error}
        </div>
      )}
    </div>
  );
}

'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Music } from 'lucide-react';

interface Props {
  onUpload: (file: File) => void;
}

export function UploadZone({ onUpload }: Props) {
  const onDrop = useCallback((files: File[]) => {
    if (files[0]) onUpload(files[0]);
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'audio/*': ['.mp3', '.wav', '.m4a', '.ogg', '.flac'] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  });

  return (
    <div
      {...getRootProps()}
      className={`mt-8 glass p-16 border-2 border-dashed cursor-pointer transition-all text-center
        ${isDragActive ? 'border-accent bg-accent/5 scale-[1.02]' : 'border-white/20 hover:border-accent/50'}`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-4">
        {isDragActive ? (
          <Music className="w-16 h-16 text-accent animate-bounce" />
        ) : (
          <Upload className="w-16 h-16 text-white/40" />
        )}
        <p className="text-xl font-medium">
          {isDragActive ? 'Drop your song here' : 'Drag & drop your song'}
        </p>
        <p className="text-white/40 text-sm">MP3, WAV, M4A, OGG, FLAC • Max 50MB</p>
      </div>
    </div>
  );
}

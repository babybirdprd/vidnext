'use client';

import { useState } from 'react';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { EffectSelector } from '@/components/effects/EffectSelector';
import { EffectPreview } from '@/components/ui/EffectPreview';
import { VideoEffect, ExportSettings } from '@/types/effects';
import { ffmpegService } from '@/lib/ffmpeg/ffmpeg-service';

const defaultExportSettings: ExportSettings = {
  width: 1920,
  height: 1080,
  fps: 30,
  format: 'mp4',
  quality: 85
};

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedEffect, setSelectedEffect] = useState<VideoEffect | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ percent: number; stage: string } | null>(null);
  const [exportSettings, setExportSettings] = useState<ExportSettings>(defaultExportSettings);

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setError(null);
  };

  const handleExport = async () => {
    if (!selectedImage || !selectedEffect) return;
    
    setIsProcessing(true);
    setError(null);
    setProgress({ percent: 0, stage: 'Initializing FFmpeg' });

    try {
      await ffmpegService.load((percent) => {
        setProgress(prev => ({ ...prev!, percent }));
      });

        const blob = await ffmpegService.generateVideo(
        selectedImage,
        selectedEffect,
        (percent, stage) => {
          setProgress({ percent, stage });
        },
        exportSettings
        );

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `video_${Date.now()}.${exportSettings.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setProgress({ percent: 100, stage: 'Export complete!' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during export');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(null), 3000);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-base-100">
      <div className="container mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-4xl font-bold">Image to Video Converter</h1>
          <p className="text-base-content/70">Transform your images into dynamic videos with custom effects</p>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="space-y-8">
            <div className="card bg-base-200 shadow-lg">
              <div className="card-body">
                <h2 className="card-title">Upload Image</h2>
                <ImageUpload onImageSelect={handleImageSelect} />
              </div>
            </div>

            <div className="card bg-base-200 shadow-lg">
              <div className="card-body">
                <h2 className="card-title">Effect Settings</h2>
                <EffectSelector 
                  onEffectChange={(effect) => {
                    setSelectedEffect(effect);
                    setError(null);
                  }} 
                  disabled={!selectedImage || isProcessing}
                />
              </div>
            </div>
          </div>

          <div className="card bg-base-200 shadow-lg">
            <div className="card-body">
              <h2 className="card-title">Preview</h2>
              {selectedImage ? (
                selectedEffect ? (
                  <EffectPreview
                    imageUrl={previewUrl}
                    effect={selectedEffect}
                  />
                ) : (
                  <div className="text-center p-4 text-base-content/70">
                    Select an effect to preview
                  </div>
                )
              ) : (
                <div className="text-center p-4 text-base-content/70">
                  Upload an image to start
                </div>
              )}
            </div>
          </div>
        </div>
        
        {error && (
          <div className="alert alert-error mb-4 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {progress && (
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm">{progress.stage}</span>
              <span className="text-sm">{progress.percent}%</span>
            </div>
            <progress 
              className="progress progress-primary w-full" 
              value={progress.percent} 
              max="100"
            />
          </div>
        )}
        
        <div className="flex justify-center gap-4">
          <button 
            className={`btn btn-primary ${(!selectedImage || !selectedEffect || isProcessing) ? 'btn-disabled' : ''}`}
            onClick={handleExport}
            disabled={!selectedImage || !selectedEffect || isProcessing}
          >
            {isProcessing ? (
              <>
                <span className="loading loading-spinner"></span>
                Processing...
              </>
            ) : (
              'Export Video'
            )}
          </button>
          {isProcessing && (
            <button 
              className="btn btn-error"
              onClick={() => ffmpegService.abort()}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </main>
  );
}


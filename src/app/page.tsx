'use client';

import { useState } from 'react';
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { EffectSelector } from '@/components/effects/EffectSelector';
import { EffectPreview } from '@/components/ui/EffectPreview';
import { ExportSettings } from '@/components/ui/ExportSettings';
import { VideoEffect, ExportSettings as ExportSettingsType, EXPORT_PRESETS } from '@/types/effects';
import { ffmpegService } from '@/lib/ffmpeg/ffmpeg-service';

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedEffect, setSelectedEffect] = useState<VideoEffect | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ percent: number; stage: string } | null>(null);
  const [exportSettings, setExportSettings] = useState<ExportSettingsType>(EXPORT_PRESETS[0]);

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

  const toolbarContent = (
    <div className="h-full flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Image to Video Converter</h1>
        <p className="text-sm text-base-content/70">Transform images into dynamic videos</p>
      </div>
      <div className="flex gap-4">
        {isProcessing && (
          <button 
            className="btn btn-error btn-sm"
            onClick={() => ffmpegService.abort()}
          >
            Cancel
          </button>
        )}
        <button 
          className={`btn btn-primary btn-sm ${(!selectedImage || !selectedEffect || isProcessing) ? 'btn-disabled' : ''}`}
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
      </div>
    </div>
  );

  const sidebarContent = (
    <div className="space-y-4">
      <ImageUpload onImageSelect={handleImageSelect} disabled={isProcessing} />
      <EffectSelector 
        onEffectChange={setSelectedEffect}
        disabled={!selectedImage || isProcessing}
      />
    </div>
  );

  const mainContent = (
    <div className="space-y-4">
      <div className="aspect-video bg-base-300 rounded-lg overflow-hidden">
        {selectedImage ? (
          selectedEffect ? (
            <EffectPreview
              imageUrl={previewUrl}
              effect={selectedEffect}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-base-content/70">
              Select an effect to preview
            </div>
          )
        ) : (
          <div className="h-full flex items-center justify-center text-base-content/70">
            Upload an image to start
          </div>
        )}
      </div>

      {error && (
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {progress && (
        <div>
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
    </div>
  );

  const rightPanelContent = (
    <ExportSettings
      settings={exportSettings}
      onSettingsChange={setExportSettings}
      disabled={isProcessing}
    />
  );

  return (
    <WorkspaceLayout
      toolbarContent={toolbarContent}
      sidebarContent={sidebarContent}
      mainContent={mainContent}
      rightPanelContent={rightPanelContent}
    />

  );
}


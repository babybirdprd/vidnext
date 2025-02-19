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
    if (!selectedImage || !selectedEffect) {
      setError('Please select an image and effect first');
      return;
    }

    setError(null);
    setIsProcessing(true);
    setProgress({ percent: 0, stage: 'Initializing' });

    try {
      // Prepare form data with validation
      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('effect', JSON.stringify(selectedEffect));
      formData.append('settings', JSON.stringify(exportSettings));

      // Send request with progress tracking
      const response = await fetch('/api/ffmpeg', {

        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate video');
      }

      // Handle successful response
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Create and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `video_${Date.now()}.${exportSettings.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgress({ percent: 100, stage: 'Export complete!' });
    } catch (err) {
      console.error('Export error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
      setProgress(null);
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
        <div className="alert alert-error mb-4">
          <span>{error}</span>
          <button 
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={() => setError(null)}
          >✕</button>
        </div>
        )}

        {progress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-base-100 p-6 rounded-lg shadow-xl max-w-md w-full">
          <h3 className="text-lg font-bold mb-4">{progress.stage}</h3>
          <progress 
            className="progress progress-primary w-full" 
            value={progress.percent} 
            max="100"
          />
          <p className="mt-2 text-center">{progress.percent}%</p>
          {isProcessing && (
            <button
            className="btn btn-error btn-sm mt-4 w-full"
            onClick={() => ffmpegService.abort()}
            >
            Cancel
            </button>
          )}
          </div>
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


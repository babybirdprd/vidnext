import { VideoEffect, ExportSettings } from '@/types/effects';

type ProgressCallback = (progress: number, stage: string) => void;

class FFmpegService {
	async generateVideo(
		imageFile: File,
		effect: VideoEffect,
		onProgress?: ProgressCallback,
		settings: ExportSettings = {
			width: 1920,
			height: 1080,
			fps: 30,
			format: 'mp4',
			quality: 85
		}
	): Promise<Blob> {
		try {
			const formData = new FormData();
			formData.append('image', imageFile);
			formData.append('effect', JSON.stringify(effect));
			formData.append('settings', JSON.stringify(settings));

			onProgress?.(10, 'Starting export');

			const response = await fetch('/api/ffmpeg', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Export failed');
			}

			onProgress?.(100, 'Complete');
			return await response.blob();
		} catch (error) {
			console.error('Video generation error:', error);
			throw error;
		}
	}

	abort() {
		// Implement abort logic if needed
	}
}

export const ffmpegService = new FFmpegService();


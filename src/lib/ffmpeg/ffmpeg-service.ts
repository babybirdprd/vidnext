import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { VideoEffect, ExportSettings } from '@/types/effects';

type ProgressCallback = (progress: number, stage: string) => void;

class FFmpegService {
	private ffmpeg: FFmpeg | null = null;
	private loaded = false;
	private abortController: AbortController | null = null;

	async load(onProgress?: (progress: number) => void) {
		if (this.loaded) return;

		this.ffmpeg = new FFmpeg();
		this.abortController = new AbortController();
		
		try {
			// Set up progress handling
			this.ffmpeg.on('progress', ({ progress }) => {
				onProgress?.(Math.round(progress * 100));
			});

			this.ffmpeg.on('log', ({ message }) => {
				console.log('FFmpeg Log:', message);
			});

			await this.ffmpeg.load({
				coreURL: '/ffmpeg/ffmpeg-core.js',
				wasmURL: '/ffmpeg/ffmpeg-core.wasm'
			});

			
			this.loaded = true;
		} catch (error) {
			console.error('FFmpeg load error:', error);
			this.cleanup();
			throw new Error(`FFmpeg failed to load. Please ensure you have a stable internet connection and try again. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

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
		if (!this.ffmpeg) throw new Error('FFmpeg not loaded');

		const inputFileName = 'input.png';
		const outputFileName = `output.${settings.format}`;

		try {
			onProgress?.(0, 'Preparing input');
			const fileData = await fetchFile(imageFile);
			await this.ffmpeg.writeFile(inputFileName, fileData);

			onProgress?.(20, 'Configuring effect');
			const filterComplex = this.generateFilterComplex(effect, settings);
			
			onProgress?.(30, 'Processing video');
			const command = [
				'-y',
				'-i', inputFileName,
				'-filter_complex', filterComplex,
				'-t', effect.params.duration.toString(),
				'-c:v', settings.format === 'mp4' ? 'libx264' : 'libvpx',
				'-b:v', `${settings.quality}M`,
				'-pix_fmt', 'yuv420p',
				'-movflags', '+faststart',
				outputFileName
			];

			await this.ffmpeg.exec(command);
			onProgress?.(90, 'Finalizing');

			const data = await this.ffmpeg.readFile(outputFileName);
			onProgress?.(95, 'Cleaning up');

			// Cleanup
			await this.cleanup();
			onProgress?.(100, 'Complete');

			return new Blob([data], { type: `video/${settings.format}` });
		} catch (error) {
			await this.cleanup();
			throw new Error(`Video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	private async cleanup() {
		if (!this.ffmpeg) return;

		try {
			await this.ffmpeg.deleteFile('input.png');
			await this.ffmpeg.deleteFile('output.mp4');
			await this.ffmpeg.deleteFile('output.webm');
		} catch (error) {
			console.error('Cleanup error:', error);
		}
	}

	abort() {
		this.abortController?.abort();
		this.cleanup();
	}

	private generateFilterComplex(effect: VideoEffect, settings: ExportSettings): string {
		const { type, params } = effect;
		const { duration, intensity = 50 } = params;
		const fps = settings.fps;
		
		switch (type) {
			case 'ZOOM':
				const zoomFactor = params.direction === 'IN' ? '1.5' : '0.6';
				return `[0:v]scale=${settings.width}:${settings.height},zoompan=z='${zoomFactor}':d=${duration*fps}:s=${settings.width}x${settings.height}[v]`;
			
			case 'PAN':
				const panDirection = this.getPanExpression(params.direction || 'LEFT', duration);
				return `[0:v]scale=${settings.width}:${settings.height},crop=w=iw:h=ih:x='${panDirection}':y=0[v]`;
			
			case 'PARALLAX':
				const speed = intensity / 100;
				return `[0:v]split[bg][fg];[bg]scale=${settings.width}:${settings.height},crop=w=iw:h=ih:x='t/${duration}*${speed}*100':y=0[bgm];[fg]scale=${settings.width}:${settings.height},crop=w=iw:h=ih:x='t/${duration}*${speed}*200':y=0[fgm];[bgm][fgm]blend=all_expr='A*(1-T/${duration})+B*(T/${duration})'[v]`;
			
			case 'WAVE':
				const amplitude = (intensity / 100) * 40;
				const frequency = 2;
				return `[0:v]scale=${settings.width}:${settings.height},wave=a=${amplitude}:r=${frequency}:d=${duration}[v]`;
			
			case 'PULSE':
				return `[0:v]scale=${settings.width}:${settings.height},crop=w=iw:h=ih:x=0:y=0,scale=w='iw+sin(t/${duration}*PI)*${intensity}':h='ih+sin(t/${duration}*PI)*${intensity}':eval=frame[v]`;
			
			case 'ROTATION':
				const rotationSpeed = (intensity / 100) * 360;
				return `[0:v]scale=${settings.width}:${settings.height},rotate='t/${duration}*${rotationSpeed}*PI/180'[v]`;
			
			case 'DRIFT':
				return `[0:v]scale=${settings.width}:${settings.height},rotate='sin(t/${duration}*PI)*${intensity/10}*PI/180':c=none,crop=w=iw:h=ih:x='sin(t/${duration}*PI)*${intensity}':y='cos(t/${duration}*PI)*${intensity}'[v]`;
			
			case 'KEN_BURNS':
				const zoomRange = 1 + (intensity / 100);
				const panRange = (intensity / 100) * 100;
				return `[0:v]scale=${settings.width}:${settings.height},zoompan=z='min(max(1,1+(t/${duration})*${zoomRange}),${zoomRange})':x='iw/2-(iw/zoom/2)+sin(t/${duration}*PI)*${panRange}':y='ih/2-(ih/zoom/2)+cos(t/${duration}*PI)*${panRange}':d=${duration*fps}:s=${settings.width}x${settings.height}[v]`;
			
			default:
				return `[0:v]scale=${settings.width}:${settings.height}[v]`;
		}
	}

	private getPanExpression(direction: string, duration: number): string {
		switch (direction) {
			case 'LEFT': return '(iw-ow)*t/duration';
			case 'RIGHT': return '(iw-ow)*(1-t/duration)';
			case 'UP': return '(ih-oh)*t/duration';
			case 'DOWN': return '(ih-oh)*(1-t/duration)';
			default: return '0';
		}
	}
}

export const ffmpegService = new FFmpegService();
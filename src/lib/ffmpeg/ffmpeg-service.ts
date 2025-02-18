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

		try {
			console.log('Creating new FFmpeg instance...');
			this.ffmpeg = new FFmpeg();
			this.abortController = new AbortController();

			this.ffmpeg.on('log', ({ message }) => {
				console.log('FFmpeg Log:', message);
			});

			this.ffmpeg.on('progress', ({ progress }) => {
				console.log('FFmpeg Progress:', Math.round(progress * 100), '%');
				onProgress?.(Math.round(progress * 100));
			});

			console.log('Loading FFmpeg core...');
			await this.ffmpeg.load({
				coreURL: await toBlobURL(`${window.location.origin}/ffmpeg/ffmpeg-core.js`, 'text/javascript'),
				wasmURL: await toBlobURL(`${window.location.origin}/ffmpeg/ffmpeg-core.wasm`, 'application/wasm')
			});


			console.log('FFmpeg loaded successfully');
			this.loaded = true;

		} catch (error) {
			console.error('FFmpeg load error:', error);
			this.cleanup();
			throw error;
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
		if (!this.ffmpeg) {
			throw new Error('FFmpeg not loaded');
		}

		const inputFileName = 'input.png';
		const outputFileName = `output.${settings.format}`;

		try {
			// Write input file
			onProgress?.(0, 'Preparing input');
			console.log('Writing input file...');
			const fileData = await fetchFile(imageFile);
			await this.ffmpeg.writeFile(inputFileName, fileData);

			// Generate filter complex
			onProgress?.(20, 'Configuring effect');
			const filterComplex = this.generateFilterComplex(effect, settings);
			console.log('Filter complex:', filterComplex);
			
			// Generate and execute FFmpeg command
			onProgress?.(30, 'Processing video');
			const command = [
				'-y',
				'-loop', '1',
				'-framerate', settings.fps.toString(),
				'-i', inputFileName,
				'-filter_complex', filterComplex,
				'-t', effect.params.duration.toString(),
				'-c:v', settings.format === 'mp4' ? 'libx264' : 'libvpx',
				'-preset', 'ultrafast',
				'-tune', 'stillimage',
				'-pix_fmt', 'yuv420p',
				'-crf', '23',
				'-movflags', '+faststart',
				outputFileName
			];

			console.log('Executing FFmpeg command:', command.join(' '));
			await this.ffmpeg.exec(command);

			// Read output file
			onProgress?.(90, 'Reading output file');
			const outputData = await this.ffmpeg.readFile(outputFileName);
			if (!outputData) {
				throw new Error('Failed to read output file');
			}

			// Create video blob
			const uint8Array = outputData instanceof Uint8Array ? outputData : new Uint8Array(Buffer.from(outputData));
			console.log('Output file size:', uint8Array.length, 'bytes');

			const mimeType = settings.format === 'mp4' ? 'video/mp4' : 'video/webm';
			const blob = new Blob([uint8Array], { type: mimeType });
			console.log('Created blob size:', blob.size, 'bytes');

			if (blob.size === 0) {
				throw new Error('Generated video blob is empty');
			}

			onProgress?.(100, 'Complete');
			return blob;
		} catch (error) {
			console.error('Video generation error:', error);
			throw error;
		} finally {
			await this.cleanup();
		}


	}

	private async cleanup() {
		if (!this.ffmpeg) return;

		const filesToClean = ['input.png', 'output.mp4', 'output.webm'];
		
		for (const file of filesToClean) {
			try {
				const exists = await this.ffmpeg.readFile(file).then(() => true).catch(() => false);
				if (exists) {
					await this.ffmpeg.deleteFile(file);
					console.log(`Cleaned up ${file}`);
				}
			} catch (error) {
				console.warn(`Failed to clean up ${file}:`, error);
			}
		}
	}

	abort() {
		this.abortController?.abort();
		this.cleanup();
	}

	private generateFilterComplex(effect: VideoEffect, settings: ExportSettings): string {
		const { type, params } = effect;
		const { duration, intensity = 50, easing = 'LINEAR' } = params;
		const fps = settings.fps;
		
		// Base scaling filter with pixel format and framerate
		const baseFilter = `[0:v]fps=${fps},scale=${settings.width}:${settings.height},format=yuv420p`;
		
		// Easing function for animations
		const getEasing = (t: string) => {
			switch (easing) {
				case 'EASE_IN': return `pow(${t},2)`;
				case 'EASE_OUT': return `1-pow(1-${t},2)`;
				case 'EASE_IN_OUT': return `if(lt(${t},0.5),2*pow(${t},2),1-pow(-2*${t}+2,2)/2)`;
				default: return t;
			}
		};

		switch (type) {
			case 'ZOOM': {
				const zoomFactor = params.direction === 'IN' ? '1.5' : '0.6';
				const t = `t/${duration}`;
				const zoomExpr = getEasing(t);
				return `${baseFilter},zoompan=z='${zoomFactor}+${zoomExpr}':d=${duration*fps}:s=${settings.width}x${settings.height}[v]`;
			}
			
			case 'PAN': {
				const t = `t/${duration}`;
				const panExpr = getEasing(t);
				const panDirection = this.getPanExpression(params.direction || 'LEFT', duration);
				return `${baseFilter},crop=w=iw:h=ih:x='${panDirection}*${panExpr}':y=0[v]`;
			}
			
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
				return `${baseFilter}[v]`;
		}
	}

	private getPanExpression(direction: string, duration: number): string {
		switch (direction) {
			case 'LEFT': return `(iw-ow)*t/${duration}`;
			case 'RIGHT': return `(iw-ow)*(1-t/${duration})`;
			case 'UP': return `(ih-oh)*t/${duration}`;
			case 'DOWN': return `(ih-oh)*(1-t/${duration})`;
			default: return '0';
		}
	}
}

export const ffmpegService = new FFmpegService();
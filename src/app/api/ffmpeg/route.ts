import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';
import { VideoEffect, ExportSettings } from '@/types/effects';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const FFMPEG_PATH = join(process.cwd(), 'src', 'ffmpeg', 'ffmpeg.exe');
const TEMP_DIR = path.resolve(os.tmpdir(), 'vidnext-temp');

export async function POST(request: NextRequest) {
	try {
		// Ensure temp directory exists and is empty
		await fs.rm(TEMP_DIR, { recursive: true, force: true });
		await fs.mkdir(TEMP_DIR, { recursive: true });

		const formData = await request.formData();
		const imageFile = formData.get('image') as File;
		const effect = JSON.parse(formData.get('effect') as string) as VideoEffect;
		const settings = JSON.parse(formData.get('settings') as string) as ExportSettings;

		if (!imageFile || !effect || !settings) {
			return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
		}

		// Validate input file
		if (!imageFile.type.startsWith('image/')) {
			return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
		}

		// Save input file with timestamp
		const timestamp = Date.now();
		const inputPath = path.join(TEMP_DIR, `input_${timestamp}.png`);
		const outputPath = path.join(TEMP_DIR, `output_${timestamp}.${settings.format}`);
		
		const buffer = await imageFile.arrayBuffer();
		await fs.writeFile(inputPath, Buffer.from(buffer));

		// Verify file was written
		const stats = await fs.stat(inputPath);
		if (stats.size === 0) {
			throw new Error('Failed to write input file');
		}

		// Prepare FFmpeg command with simplified options
		const args = [
			'-hide_banner',
			'-y',
			'-i', inputPath,
			'-vf', `fps=${settings.fps},scale=${settings.width}:${settings.height}`,
			'-c:v', 'libx264',
			'-preset', 'ultrafast', // Use ultrafast preset for testing
			'-t', effect.params.duration.toString(),
			'-pix_fmt', 'yuv420p',
			outputPath
		];

		// Execute FFmpeg with additional logging
		await new Promise<void>((resolve, reject) => {
			console.log('Executing FFmpeg with args:', args.join(' '));
			const process = spawn(FFMPEG_PATH, args);
			
			let errorOutput = '';
			
			process.stderr.on('data', (data: Buffer) => {
				const output = data.toString();
				errorOutput += output;
				console.log('FFmpeg output:', output);
			});

			process.on('error', (err) => {
				console.error('FFmpeg process error:', err);
				console.error('Full error output:', errorOutput);
				reject(err);
			});

			process.on('exit', (code: number) => {
				console.log('FFmpeg exit code:', code);
				if (code === 0) resolve();
				else {
					console.error('Full error output:', errorOutput);
					reject(new Error(`FFmpeg exited with code ${code}`));
				}
			});
		});

		// Read output file
		const outputBuffer = await fs.readFile(outputPath);
		
		// Cleanup
		await fs.rm(inputPath).catch(console.error);
		await fs.rm(outputPath).catch(console.error);

		// Return video
		const headers = new Headers();
		headers.set('Content-Type', `video/${settings.format}`);
		headers.set('Content-Disposition', `attachment; filename="video_${Date.now()}.${settings.format}"`);

		return new NextResponse(outputBuffer, { headers });
	} catch (error) {
		console.error('FFmpeg processing error:', error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'FFmpeg processing failed' },
			{ status: 500 }
		);
	}
}

function generateFilterComplex(effect: VideoEffect, settings: ExportSettings): string {
	const { type, params } = effect;
	const { duration, intensity = 50, easing = 'LINEAR' } = params;
	const fps = settings.fps;
	const totalFrames = Math.ceil(duration * fps);
	
	const baseFilter = `[0:v]format=pix_fmts=yuva420p,fps=${fps},scale=${settings.width}:${settings.height}:force_original_aspect_ratio=decrease,pad=${settings.width}:${settings.height}:(ow-iw)/2:(oh-ih)/2`;
	
	const getEasing = (t: string) => {
		switch (easing) {
			case 'EASE_IN': return `pow(${t},2)`;
			case 'EASE_OUT': return `1-pow(1-${t},2)`;
			case 'EASE_IN_OUT': return `if(lt(${t},0.5),2*pow(${t},2),1-pow(-2*${t}+2,2)/2)`;
			default: return t;
		}
	};

	const t = `t/${duration}`;

	switch (type) {
		case 'ZOOM': {
			const zoomFactor = params.direction === 'IN' ? '1.5' : '0.6';
			return `${baseFilter}[base];[base]zoompan=z='if(between(t,0,${duration}),${zoomFactor}+${getEasing(t)},${zoomFactor})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${settings.width}x${settings.height}:fps=${fps},format=yuv420p[v]`;
		}
		case 'PAN': {
			const getPanExpression = (direction: string) => {
				const range = 'iw-ow';
				switch (direction) {
					case 'LEFT': return `${range}*${t}`;
					case 'RIGHT': return `${range}*(1-${t})`;
					case 'UP': return `${range}*${t}`;
					case 'DOWN': return `${range}*(1-${t})`;
					default: return '0';
				}
			};
			const panDirection = getPanExpression(params.direction || 'LEFT');
			return `${baseFilter}[base];[base]crop=w=iw:h=ih:x='if(between(t,0,${duration}),${panDirection},0)':y=0,format=yuv420p[v]`;
		}
		case 'PARALLAX': {
			const speed = intensity / 100;
			return `${baseFilter}[base];[base]split[bg][fg];[bg]crop=w=iw:h=ih:x='if(between(t,0,${duration}),t/${duration}*${speed}*100,0)':y=0[bgm];[fg]crop=w=iw:h=ih:x='if(between(t,0,${duration}),t/${duration}*${speed}*200,0)':y=0[fgm];[bgm][fgm]blend=all_expr='A*(1-T/${duration})+B*(T/${duration})',format=yuv420p[v]`;
		}
		case 'WAVE': {
			const amplitude = (intensity / 100) * 20;
			return `${baseFilter}[base];[base]split[bg][fg];[bg]crop=w=iw:h=ih,format=yuv420p[bgm];[fg]crop=w=iw:h=ih,format=yuv420p[fgm];[bgm][fgm]blend=all_expr='A*(1-sin(X/${settings.width}*PI*2+T/${duration})*${amplitude/100})+B*sin(X/${settings.width}*PI*2+T/${duration})*${amplitude/100}',format=yuv420p[v]`;
		}
		case 'PULSE': {
			const pulseIntensity = (intensity / 100) * 0.5;
			return `${baseFilter}[base];[base]scale=w='if(between(t,0,${duration}),iw*(1+sin(t/${duration}*PI)*${pulseIntensity}),iw)':h='if(between(t,0,${duration}),ih*(1+sin(t/${duration}*PI)*${pulseIntensity}),ih)':eval=frame,format=yuv420p[v]`;
		}
		case 'ROTATION': {
			const rotationSpeed = (intensity / 100) * 360;
			return `${baseFilter}[base];[base]rotate='if(between(t,0,${duration}),t/${duration}*${rotationSpeed}*PI/180,0)':fillcolor=none,format=yuv420p[v]`;
		}
		case 'DRIFT': {
			const driftIntensity = (intensity / 100) * 50;
			return `${baseFilter}[base];[base]rotate='if(between(t,0,${duration}),sin(t/${duration}*PI)*${driftIntensity/10}*PI/180,0)':c=none,crop=w=iw:h=ih:x='if(between(t,0,${duration}),sin(t/${duration}*PI)*${driftIntensity},0)':y='if(between(t,0,${duration}),cos(t/${duration}*PI)*${driftIntensity},0)',format=yuv420p[v]`;
		}
		case 'KEN_BURNS': {
			const zoomRange = 1 + (intensity / 100);
			const panRange = (intensity / 100) * 50;
			return `${baseFilter}[base];[base]zoompan=z='if(between(t,0,${duration}),1+((t/${duration})*${zoomRange-1}),${zoomRange})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=${settings.width}x${settings.height}:fps=${fps},format=yuv420p[v]`;
		}
		default:
			return `${baseFilter},format=yuv420p[v]`;
	}
}


export const config = {
	api: {
		bodyParser: false,
		responseLimit: false,
	},
};
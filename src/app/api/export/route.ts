import { NextRequest, NextResponse } from 'next/server';
import { ffmpegService } from '@/lib/ffmpeg/ffmpeg-service';
import { VideoEffectSchema, ExportSettingsSchema } from '@/types/effects';
import { z } from 'zod';

export async function POST(request: NextRequest) {
	try {
		console.log('Received video export request');
		
		// Parse form data
		const formData = await request.formData();
		const imageFile = formData.get('image');
		const effectJson = formData.get('effect');
		const settingsJson = formData.get('settings');

		// Validate inputs
		if (!imageFile || !(imageFile instanceof File)) {
			return NextResponse.json(
				{ error: 'Invalid or missing image file' },
				{ status: 400 }
			);
		}

		if (!effectJson || typeof effectJson !== 'string') {
			return NextResponse.json(
				{ error: 'Invalid or missing effect configuration' },
				{ status: 400 }
			);
		}

		let effect;
		let settings;

		try {
			effect = VideoEffectSchema.parse(JSON.parse(effectJson));
			if (settingsJson && typeof settingsJson === 'string') {
				settings = ExportSettingsSchema.parse(JSON.parse(settingsJson));
			}
		} catch (error) {
			console.error('Validation error:', error);
			return NextResponse.json(
				{ error: error instanceof z.ZodError ? error.errors : 'Invalid parameters' },
				{ status: 400 }
			);
		}

		console.log('Starting FFmpeg processing');
		
		// Load FFmpeg if not already loaded
		await ffmpegService.load();

		// Generate video
		const videoBlob = await ffmpegService.generateVideo(
			imageFile as File,
			effect,
			(progress, stage) => {
				console.log(`Export progress: ${progress}% - ${stage}`);
			},
			settings
		);

		console.log('Video generation complete');

		// Set appropriate headers for video download
		return new NextResponse(videoBlob, {
			headers: {
				'Content-Type': `video/${settings?.format || 'mp4'}`,
				'Content-Disposition': `attachment; filename="video_${Date.now()}.${settings?.format || 'mp4'}"`,
			},
		});
	} catch (error) {
		console.error('Export error:', error);
		
		// Determine if it's a known error type
		if (error instanceof Error) {
			return NextResponse.json(
				{ error: error.message },
				{ status: 500 }
			);
		}

		return NextResponse.json(
			{ error: 'An unexpected error occurred during video export' },
			{ status: 500 }
		);
	}
}

export const config = {
	api: {
		bodyParser: false,
	},
};
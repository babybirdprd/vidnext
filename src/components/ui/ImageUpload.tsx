'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface ImageUploadProps {
	onImageSelect: (file: File) => void;
	disabled?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = {
	'image/jpeg': ['.jpg', '.jpeg'],
	'image/png': ['.png'],
	'image/webp': ['.webp']
};

export function ImageUpload({ onImageSelect, disabled = false }: ImageUploadProps) {
	const [preview, setPreview] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const validateFile = (file: File) => {
		if (file.size > MAX_FILE_SIZE) {
			throw new Error('File size must be less than 10MB');
		}
		
		const img = new Image();
		return new Promise<void>((resolve, reject) => {
			img.onload = () => {
				if (img.width < 500 || img.height < 500) {
					reject(new Error('Image must be at least 500x500 pixels'));
				}
				resolve();
			};
			img.onerror = () => reject(new Error('Failed to load image'));
			img.src = URL.createObjectURL(file);
		});
	};

	const onDrop = useCallback(async (acceptedFiles: File[]) => {
		const file = acceptedFiles[0];
		if (!file) return;

		setError(null);
		setLoading(true);

		try {
			await validateFile(file);
			
			const reader = new FileReader();
			reader.onloadend = () => {
				setPreview(reader.result as string);
				setLoading(false);
			};
			reader.onerror = () => {
				setError('Failed to read file');
				setLoading(false);
			};
			reader.readAsDataURL(file);
			onImageSelect(file);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to process image');
			setLoading(false);
		}
	}, [onImageSelect]);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: ACCEPTED_TYPES,
		maxFiles: 1,
		disabled: disabled || loading,
		maxSize: MAX_FILE_SIZE,
	});

	return (
		<div className="w-full space-y-2">
			<div
				{...getRootProps()}
				className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
					${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
					${isDragActive ? 'border-primary bg-base-300' : 'border-base-300 hover:border-primary'}
					${error ? 'border-error' : ''}`}
			>
				<input {...getInputProps()} />
				
				{loading ? (
					<div className="space-y-2">
						<div className="loading loading-spinner loading-md"></div>
						<p className="text-sm">Processing image...</p>
					</div>
				) : preview ? (
					<div className="space-y-4">
						<img
							src={preview}
							alt="Preview"
							className="max-h-64 mx-auto object-contain rounded-lg"
						/>
						<p className="text-sm">
							{disabled ? 'Image upload disabled during processing' : 'Drop a new image to replace'}
						</p>
					</div>
				) : (
					<div className="space-y-2">
						<svg 
							className="mx-auto h-12 w-12 text-base-content/50" 
							stroke="currentColor" 
							fill="none" 
							viewBox="0 0 48 48" 
							aria-hidden="true"
						>
							<path 
								strokeLinecap="round" 
								strokeLinejoin="round" 
								strokeWidth="2" 
								d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
							/>
						</svg>
						<div className="text-lg">
							{disabled ? 'Image upload disabled' : 'Drop an image here'}
						</div>
						<p className="text-sm text-base-content/70">
							PNG, JPG, or WebP (max 10MB)
						</p>
					</div>
				)}
			</div>
			
			{error && (
				<div className="alert alert-error text-sm">
					<svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<span>{error}</span>
				</div>
			)}
		</div>
	);
}
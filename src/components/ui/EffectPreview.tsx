'use client';

import { useEffect, useRef } from 'react';
import { VideoEffect } from '@/types/effects';

interface EffectPreviewProps {
	imageUrl: string | null;
	effect: VideoEffect;
}

export function EffectPreview({ imageUrl, effect }: EffectPreviewProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const imageRef = useRef<HTMLImageElement>(null);

	useEffect(() => {
		if (!imageRef.current || !imageUrl || !containerRef.current) return;

		const { type, params } = effect;
		const { duration, intensity = 50 } = params;
		const image = imageRef.current;

		// Reset previous animations
		image.style.animation = 'none';
		image.style.filter = 'none';
		void image.offsetWidth;

		const keyframes = generateKeyframes(type, params);
		const easing = getEasing(params.easing);
		const animation = `${type.toLowerCase()}-effect ${duration}s ${easing} infinite`;

		// Add keyframes style
		const styleSheet = document.styleSheets[0];
		const keyframeName = `${type.toLowerCase()}-effect`;

		// Remove existing keyframes
		try {
			for (let i = 0; i < styleSheet.cssRules.length; i++) {
				const rule = styleSheet.cssRules[i];
				if (rule instanceof CSSKeyframesRule && rule.name === keyframeName) {
					styleSheet.deleteRule(i);
					break;
				}
			}
		} catch (e) {
			console.error('Error cleaning up keyframes:', e);
		}

		// Add new keyframes
		try {
			styleSheet.insertRule(`@keyframes ${keyframeName} ${keyframes}`, styleSheet.cssRules.length);
		} catch (e) {
			console.error('Error adding keyframes:', e);
		}

		// Apply animation and filters
		image.style.animation = animation;
		if (type === 'WAVE') {
			const distortionAmount = Math.min(intensity / 2, 25);
			image.style.filter = `url("data:image/svg+xml,${generateWaveFilter(distortionAmount)}")`;
		}
	}, [effect, imageUrl]);

	const getEasing = (easing: string): string => {
		switch (easing) {
			case 'EASE_IN': return 'cubic-bezier(0.4, 0, 1, 1)';
			case 'EASE_OUT': return 'cubic-bezier(0, 0, 0.2, 1)';
			case 'EASE_IN_OUT': return 'cubic-bezier(0.4, 0, 0.2, 1)';
			default: return 'linear';
		}
	};

	const generateKeyframes = (type: string, params: any): string => {
		const intensityFactor = params.intensity / 100;

		switch (type) {
			case 'ZOOM':
				const scale = params.direction === 'IN' ? 1 + intensityFactor : 1 - intensityFactor * 0.5;
				return `{ 
					0% { transform: scale(1); }
					100% { transform: scale(${scale}); }
				}`;

			case 'PAN':
				const distance = 50 * intensityFactor;
				const direction = params.direction?.toLowerCase() || 'left';
				const transform = direction === 'left' || direction === 'right'
					? `translateX(${direction === 'left' ? '-' : ''}${distance}%)`
					: `translateY(${direction === 'up' ? '-' : ''}${distance}%)`;
				return `{
					0% { transform: translate(0); }
					100% { transform: ${transform}; }
				}`;

			case 'PARALLAX':
				const depth = 20 * intensityFactor;
				return `{
					0% { transform: translate3d(0, 0, 0) scale(1.1); }
					25% { transform: translate3d(${depth}px, ${-depth}px, 0) scale(1.1); }
					50% { transform: translate3d(${depth}px, ${depth}px, 0) scale(1.1); }
					75% { transform: translate3d(${-depth}px, ${depth}px, 0) scale(1.1); }
					100% { transform: translate3d(0, 0, 0) scale(1.1); }
				}`;

			case 'ROTATION':
				return `{
					0% { transform: rotate(0deg); }
					100% { transform: rotate(${360 * intensityFactor}deg); }
				}`;

			case 'PULSE':
				const pulseScale = 1 + (0.3 * intensityFactor);
				return `{
					0%, 100% { transform: scale(1); filter: brightness(1); }
					50% { transform: scale(${pulseScale}); filter: brightness(1.1); }
				}`;

			case 'DRIFT':
				const driftDistance = 30 * intensityFactor;
				const rotation = 15 * intensityFactor;
				return `{
					0% { transform: translate(0, 0) rotate(0deg); }
					25% { transform: translate(${driftDistance}px, ${-driftDistance}px) rotate(${rotation}deg); }
					50% { transform: translate(${driftDistance}px, ${driftDistance}px) rotate(0deg); }
					75% { transform: translate(${-driftDistance}px, ${driftDistance}px) rotate(${-rotation}deg); }
					100% { transform: translate(0, 0) rotate(0deg); }
				}`;

			case 'KEN_BURNS':
				const zoomAmount = 1 + (0.3 * intensityFactor);
				const panAmount = 10 * intensityFactor;
				return `{
					0% { transform: scale(1) translate(0, 0); }
					25% { transform: scale(${zoomAmount}) translate(${panAmount}%, ${-panAmount}%); }
					50% { transform: scale(${zoomAmount * 0.9}) translate(${-panAmount}%, ${-panAmount}%); }
					75% { transform: scale(${zoomAmount * 1.1}) translate(${-panAmount}%, ${panAmount}%); }
					100% { transform: scale(1) translate(0, 0); }
				}`;

			default:
				return `{
					0% { transform: none; }
					100% { transform: none; }
				}`;
		}
	};

	const generateWaveFilter = (amount: number): string => {
		const svg = `<svg><defs><filter id="wave"><feDisplacementMap in="SourceGraphic" scale="${amount}" xChannelSelector="R" yChannelSelector="G"><animate attributeName="scale" values="${amount};${amount * 1.5};${amount}" dur="2s" repeatCount="indefinite"/></filter></defs></svg>`;
		return encodeURIComponent(svg);
	};

	return (
		<div className="relative w-full aspect-video bg-base-300 rounded-lg overflow-hidden">
			<div ref={containerRef} className="absolute inset-0 flex items-center justify-center">
				{imageUrl ? (
					<img
						ref={imageRef}
						src={imageUrl}
						alt="Preview"
						className="max-w-full max-h-full object-contain"
						style={{ 
							transformOrigin: 'center center',
							willChange: 'transform',
							backfaceVisibility: 'hidden'
						}}
					/>
				) : (
					<div className="text-base-content/50">Upload an image to preview effects</div>
				)}
			</div>
		</div>
	);
}
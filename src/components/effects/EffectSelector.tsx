'use client';

import { useState, useEffect } from 'react';
import { EffectType, EffectParams, VideoEffect } from '@/types/effects';

interface EffectSelectorProps {
	onEffectChange: (effect: VideoEffect) => void;
	disabled?: boolean;
}

const EFFECT_PRESETS: Record<string, VideoEffect> = {
	'Gentle Zoom In': {
		type: 'ZOOM',
		params: { duration: 5, intensity: 30, direction: 'IN', easing: 'EASE_IN_OUT' }
	},
	'Dramatic Ken Burns': {
		type: 'KEN_BURNS',
		params: { duration: 8, intensity: 70, easing: 'EASE_IN_OUT' }
	},
	'Smooth Parallax': {
		type: 'PARALLAX',
		params: { duration: 6, intensity: 40, easing: 'EASE_IN_OUT' }
	},
	'Subtle Pulse': {
		type: 'PULSE',
		params: { duration: 4, intensity: 25, easing: 'EASE_IN_OUT' }
	}
};

const EFFECT_DESCRIPTIONS: Record<EffectType, string> = {
	'ZOOM': 'Smoothly zoom in or out of the image',
	'PAN': 'Move across the image in a specified direction',
	'PARALLAX': 'Create depth by moving layers at different speeds',
	'WAVE': 'Apply a rippling wave distortion effect',
	'PULSE': 'Gentle pulsing animation with brightness variation',
	'ROTATION': 'Rotate the image around its center',
	'DRIFT': 'Organic floating movement with slight rotation',
	'KEN_BURNS': 'Professional pan and zoom combination'
};

export function EffectSelector({ onEffectChange, disabled = false }: EffectSelectorProps) {
	const [selectedEffect, setSelectedEffect] = useState<VideoEffect>(EFFECT_PRESETS['Gentle Zoom In']);

	useEffect(() => {
		// Reset direction when switching between effect types
		if (!['ZOOM', 'PAN'].includes(selectedEffect.type)) {
			const { direction, ...rest } = selectedEffect.params;
			setSelectedEffect(prev => ({
				...prev,
				params: rest
			}));
		}
	}, [selectedEffect.type]);

	const handleTypeChange = (type: EffectType) => {
		const newEffect = { 
			...selectedEffect,
			type,
			params: {
				...selectedEffect.params,
				direction: ['ZOOM', 'PAN'].includes(type) ? selectedEffect.params.direction : undefined
			}
		};
		setSelectedEffect(newEffect);
		onEffectChange(newEffect);
	};

	const handleParamChange = (key: keyof EffectParams, value: any) => {
		const newEffect = {
			...selectedEffect,
			params: { ...selectedEffect.params, [key]: value }
		};
		setSelectedEffect(newEffect);
		onEffectChange(newEffect);
	};

	return (
		<div className="space-y-6">
			<div className="flex gap-2 mb-4 overflow-x-auto pb-2">
				{Object.entries(EFFECT_PRESETS).map(([name, preset]) => (
					<button
						key={name}
						className={`btn btn-sm ${selectedEffect.type === preset.type ? 'btn-primary' : 'btn-ghost'}`}
						onClick={() => {
							setSelectedEffect(preset);
							onEffectChange(preset);
						}}
						disabled={disabled}
					>
						{name}
					</button>
				))}
			</div>

			<div className="form-control">
				<label className="label">
					<span className="label-text">Effect Type</span>
				</label>
				<select 
					className="select select-bordered"
					value={selectedEffect.type}
					onChange={(e) => handleTypeChange(e.target.value as EffectType)}
					disabled={disabled}
				>
					{Object.entries(EFFECT_DESCRIPTIONS).map(([type, description]) => (
						<option key={type} value={type} title={description}>
							{type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' ')}
						</option>
					))}
				</select>
				<label className="label">
					<span className="label-text-alt text-base-content/70">
						{EFFECT_DESCRIPTIONS[selectedEffect.type]}
					</span>
				</label>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="form-control">
					<label className="label">
						<span className="label-text">Duration</span>
						<span className="label-text-alt">{selectedEffect.params.duration}s</span>
					</label>
					<input
						type="range"
						min="1"
						max="30"
						value={selectedEffect.params.duration}
						onChange={(e) => handleParamChange('duration', Number(e.target.value))}
						className="range range-primary range-sm"
						disabled={disabled}
					/>
					<div className="w-full flex justify-between text-xs px-2 mt-1">
						<span>1s</span>
						<span>15s</span>
						<span>30s</span>
					</div>
				</div>

				<div className="form-control">
					<label className="label">
						<span className="label-text">
							{selectedEffect.type === 'WAVE' ? 'Wave Amplitude' :
							 selectedEffect.type === 'ROTATION' ? 'Rotation Speed' :
							 selectedEffect.type === 'DRIFT' ? 'Drift Range' :
							 'Intensity'}
						</span>
						<span className="label-text-alt">{selectedEffect.params.intensity}%</span>
					</label>
					<input
						type="range"
						min="0"
						max="100"
						value={selectedEffect.params.intensity}
						onChange={(e) => handleParamChange('intensity', Number(e.target.value))}
						className="range range-primary range-sm"
						disabled={disabled}
					/>
					<div className="w-full flex justify-between text-xs px-2 mt-1">
						<span>Subtle</span>
						<span>Medium</span>
						<span>Strong</span>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{selectedEffect.type !== 'WAVE' && (
					<div className="form-control">
						<label className="label">
							<span className="label-text">Easing</span>
						</label>
						<select
							className="select select-bordered"
							value={selectedEffect.params.easing}
							onChange={(e) => handleParamChange('easing', e.target.value)}
							disabled={disabled}
						>
							<option value="LINEAR">Linear</option>
							<option value="EASE_IN">Ease In</option>
							<option value="EASE_OUT">Ease Out</option>
							<option value="EASE_IN_OUT">Ease In Out</option>
						</select>
					</div>
				)}

				{['ZOOM', 'PAN'].includes(selectedEffect.type) && (
					<div className="form-control">
						<label className="label">
							<span className="label-text">Direction</span>
						</label>
						<select
							className="select select-bordered"
							value={selectedEffect.params.direction}
							onChange={(e) => handleParamChange('direction', e.target.value)}
							disabled={disabled}
						>
							{selectedEffect.type === 'ZOOM' ? (
								<>
									<option value="IN">Zoom In</option>
									<option value="OUT">Zoom Out</option>
								</>
							) : (
								<>
									<option value="LEFT">Left</option>
									<option value="RIGHT">Right</option>
									<option value="UP">Up</option>
									<option value="DOWN">Down</option>
								</>
							)}
						</select>
					</div>
				)}
			</div>
		</div>
	);
}
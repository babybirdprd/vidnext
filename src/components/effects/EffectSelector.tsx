'use client';

import { useState, useEffect, useCallback } from 'react';
import { EffectType, EffectParams, VideoEffect } from '@/types/effects';

type EffectCategory = 'Basic' | 'Dynamic' | 'Creative';

const EFFECT_CATEGORIES: Record<EffectCategory, { effects: EffectType[], description: string }> = {
	'Basic': {
		effects: ['ZOOM', 'PAN'],
		description: 'Simple, effective movements'
	},
	'Dynamic': {
		effects: ['PARALLAX', 'DRIFT', 'KEN_BURNS'],
		description: 'Complex, cinematic effects'
	},
	'Creative': {
		effects: ['WAVE', 'PULSE', 'ROTATION'],
		description: 'Artistic and unique animations'
	}
};

interface EffectSelectorProps {
	onEffectChange: (effect: VideoEffect) => void;
	disabled?: boolean;
}

const EFFECT_PRESETS: Record<string, VideoEffect & { description: string }> = {
	'Gentle Zoom In': {
		type: 'ZOOM',
		params: { duration: 5, intensity: 30, direction: 'IN', easing: 'EASE_IN_OUT' },
		description: 'Subtle zoom that draws attention'
	},
	'Cinematic Ken Burns': {
		type: 'KEN_BURNS',
		params: { duration: 8, intensity: 70, easing: 'EASE_IN_OUT' },
		description: 'Professional pan and zoom effect'
	},
	'Dynamic Parallax': {
		type: 'PARALLAX',
		params: { duration: 6, intensity: 40, easing: 'EASE_IN_OUT' },
		description: 'Creates depth with layered movement'
	},
	'Smooth Pulse': {
		type: 'PULSE',
		params: { duration: 4, intensity: 25, easing: 'EASE_IN_OUT' },
		description: 'Gentle breathing animation'
	}
};

const PARAMETER_PRESETS = {
	duration: [
		{ label: 'Quick', value: 3 },
		{ label: 'Standard', value: 5 },
		{ label: 'Long', value: 8 }
	],
	intensity: [
		{ label: 'Subtle', value: 25 },
		{ label: 'Medium', value: 50 },
		{ label: 'Strong', value: 75 }
	]
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
	const [activeCategory, setActiveCategory] = useState<EffectCategory>('Basic');

	// Add keyboard shortcuts
	useEffect(() => {
		const handleKeyPress = (e: KeyboardEvent) => {
			if (e.altKey && !disabled) {
				switch(e.key) {
					case '1': setActiveCategory('Basic'); break;
					case '2': setActiveCategory('Dynamic'); break;
					case '3': setActiveCategory('Creative'); break;
				}
			}
		};
		window.addEventListener('keydown', handleKeyPress);
		return () => window.removeEventListener('keydown', handleKeyPress);
	}, [disabled]);

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
			{/* Categories with tooltips */}
			<div className="tabs tabs-boxed">
				{Object.entries(EFFECT_CATEGORIES).map(([category, { description }], index) => (
					<div key={category} className="tooltip" data-tip={description}>
						<button
							className={`tab ${activeCategory === category ? 'tab-active' : ''}`}
							onClick={() => setActiveCategory(category as EffectCategory)}
							disabled={disabled}
						>
							{category}
							<span className="ml-2 opacity-50 text-xs">Alt+{index + 1}</span>
						</button>
					</div>
				))}
			</div>

			{/* Quick presets with visual previews */}
			<div className="grid grid-cols-2 gap-3">
				{Object.entries(EFFECT_PRESETS)
					.filter(([_, preset]) => EFFECT_CATEGORIES[activeCategory].effects.includes(preset.type))
					.map(([name, preset]) => (
						<div key={name} className="card bg-base-200 hover:bg-base-300 transition-colors">
							<button
								className="card-body p-3"
								onClick={() => {
									setSelectedEffect(preset);
									onEffectChange(preset);
								}}
								disabled={disabled}
							>
								<h3 className="card-title text-sm">{name}</h3>
								<p className="text-xs opacity-70">{preset.description}</p>
							</button>
						</div>
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
						<div className="flex gap-1">
							{PARAMETER_PRESETS.duration.map(preset => (
								<button
									key={preset.label}
									className="btn btn-xs"
									onClick={() => handleParamChange('duration', preset.value)}
									disabled={disabled}
								>
									{preset.label}
								</button>
							))}
						</div>
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
						<span>{selectedEffect.params.duration}s</span>
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
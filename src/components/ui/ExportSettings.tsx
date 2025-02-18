'use client';

import { useState } from 'react';
import { ExportSettings, ExportPreset, EXPORT_PRESETS } from '@/types/effects';

interface ExportSettingsProps {
	settings: ExportSettings;
	onSettingsChange: (settings: ExportSettings) => void;
	disabled?: boolean;
}

export function ExportSettings({ settings, onSettingsChange, disabled = false }: ExportSettingsProps) {
	const [selectedPreset, setSelectedPreset] = useState<string>('YouTube');
	const [isCustom, setIsCustom] = useState(false);

	const handlePresetChange = (presetName: string) => {
		setSelectedPreset(presetName);
		const preset = EXPORT_PRESETS.find(p => p.name === presetName);
		if (preset) {
			setIsCustom(presetName === 'Custom');
			onSettingsChange(preset);
		}
	};

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{EXPORT_PRESETS.map((preset) => (
					<button
						key={preset.name}
						className={`btn btn-outline ${selectedPreset === preset.name ? 'btn-primary' : ''} ${disabled ? 'btn-disabled' : ''}`}
						onClick={() => handlePresetChange(preset.name)}
						disabled={disabled}
					>
						<div className="text-left">
							<div className="font-bold">{preset.name}</div>
							<div className="text-xs opacity-70">{preset.description}</div>
						</div>
					</button>
				))}
			</div>

			{isCustom && (
				<div className="grid grid-cols-2 gap-4">
					<div className="form-control">
						<label className="label">
							<span className="label-text">Width</span>
						</label>
						<input
							type="number"
							className="input input-bordered"
							value={settings.width}
							onChange={(e) => onSettingsChange({ ...settings, width: parseInt(e.target.value) || 1920 })}
							min="100"
							max="3840"
							disabled={disabled}
						/>
					</div>
					<div className="form-control">
						<label className="label">
							<span className="label-text">Height</span>
						</label>
						<input
							type="number"
							className="input input-bordered"
							value={settings.height}
							onChange={(e) => onSettingsChange({ ...settings, height: parseInt(e.target.value) || 1080 })}
							min="100"
							max="2160"
							disabled={disabled}
						/>
					</div>
					<div className="form-control">
						<label className="label">
							<span className="label-text">FPS</span>
						</label>
						<input
							type="number"
							className="input input-bordered"
							value={settings.fps}
							onChange={(e) => onSettingsChange({ ...settings, fps: parseInt(e.target.value) || 30 })}
							min="1"
							max="60"
							disabled={disabled}
						/>
					</div>
					<div className="form-control">
						<label className="label">
							<span className="label-text">Quality</span>
						</label>
						<input
							type="range"
							className="range range-primary"
							value={settings.quality}
							onChange={(e) => onSettingsChange({ ...settings, quality: parseInt(e.target.value) })}
							min="1"
							max="100"
							disabled={disabled}
						/>
						<div className="text-xs text-center mt-1">{settings.quality}%</div>
					</div>
				</div>
			)}
		</div>
	);
}
import { z } from "zod";

export const EffectTypeSchema = z.enum([
	"ZOOM",
	"PAN",
	"PARALLAX",
	"WAVE",
	"PULSE",
	"ROTATION",
	"DRIFT",
	"KEN_BURNS",
]);

export type EffectType = z.infer<typeof EffectTypeSchema>;

export const EffectParamsSchema = z.object({
	duration: z.number().min(1).max(30),
	intensity: z.number().min(0).max(100),
	direction: z.enum(["IN", "OUT", "LEFT", "RIGHT", "UP", "DOWN"]).optional(),
	easing: z.enum(["LINEAR", "EASE_IN", "EASE_OUT", "EASE_IN_OUT"]),
});

export type EffectParams = z.infer<typeof EffectParamsSchema>;

export const VideoEffectSchema = z.object({
	type: EffectTypeSchema,
	params: EffectParamsSchema,
});

export type VideoEffect = z.infer<typeof VideoEffectSchema>;

export const ExportSettingsSchema = z.object({
	width: z.number().min(100).max(3840),
	height: z.number().min(100).max(2160),
	fps: z.number().min(1).max(60),
	format: z.enum(["mp4", "webm"]),
	quality: z.number().min(1).max(100),
});

export type ExportSettings = z.infer<typeof ExportSettingsSchema>;
import { z } from 'zod';

export const TableNameSchema = z.enum(['settings', 'models', 'history', 'syncQueue']);
export type TableName = z.infer<typeof TableNameSchema>;

export const DbQueryRequestSchema = z.object({
  table: TableNameSchema,
  where: z.record(z.string(), z.unknown()).optional(),
  orderBy: z.string().optional(),
  limit: z.number().int().positive().optional(),
});
export type DbQueryRequest = z.infer<typeof DbQueryRequestSchema>;

export const DbQueryResponseSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())),
});
export type DbQueryResponse = z.infer<typeof DbQueryResponseSchema>;

export const DbMutateRequestSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('insert'),
    table: TableNameSchema,
    data: z.record(z.string(), z.unknown()),
  }),
  z.object({
    op: z.literal('update'),
    table: TableNameSchema,
    where: z.record(z.string(), z.unknown()),
    data: z.record(z.string(), z.unknown()),
  }),
  z.object({
    op: z.literal('delete'),
    table: TableNameSchema,
    where: z.record(z.string(), z.unknown()),
  }),
  z.object({
    op: z.literal('upsert'),
    table: TableNameSchema,
    data: z.record(z.string(), z.unknown()),
    conflictKeys: z.array(z.string()).min(1),
  }),
]);
export type DbMutateRequest = z.infer<typeof DbMutateRequestSchema>;

export const DbMutateResponseSchema = z.object({
  affected: z.number().int().nonnegative(),
});
export type DbMutateResponse = z.infer<typeof DbMutateResponseSchema>;

export const DbChangeEventSchema = z.object({
  table: TableNameSchema,
  op: z.enum(['insert', 'update', 'delete', 'upsert']),
});
export type DbChangeEvent = z.infer<typeof DbChangeEventSchema>;

export const ModelCatalogEntrySchema = z.object({
  repoId: z.string(),
  displayName: z.string(),
  files: z.array(z.string()),
  sizeMb: z.number().optional(),
  recommended: z.boolean().optional(),
});
export type ModelCatalogEntry = z.infer<typeof ModelCatalogEntrySchema>;

export const ModelsListCatalogResponseSchema = z.object({
  entries: z.array(ModelCatalogEntrySchema),
  source: z.enum(['hub', 'cache', 'fallback']),
});
export type ModelsListCatalogResponse = z.infer<typeof ModelsListCatalogResponseSchema>;

export const ModelsDownloadStartRequestSchema = z.object({ repoId: z.string() });
export type ModelsDownloadStartRequest = z.infer<typeof ModelsDownloadStartRequestSchema>;

export const ModelsDownloadCancelRequestSchema = z.object({ repoId: z.string() });
export type ModelsDownloadCancelRequest = z.infer<typeof ModelsDownloadCancelRequestSchema>;

export const ModelsDeleteRequestSchema = z.object({ repoId: z.string() });
export type ModelsDeleteRequest = z.infer<typeof ModelsDeleteRequestSchema>;

export const ModelsProgressPhaseSchema = z.enum([
  'probing',
  'downloading',
  'done',
  'error',
  'canceled',
]);
export type ModelsProgressPhase = z.infer<typeof ModelsProgressPhaseSchema>;

export const ModelsProgressEventSchema = z.object({
  repoId: z.string(),
  totalDownloaded: z.number().int().nonnegative(),
  totalBytes: z.number().int().nonnegative(),
  currentFile: z.string(),
  phase: ModelsProgressPhaseSchema,
  error: z.string().optional(),
});
export type ModelsProgressEvent = z.infer<typeof ModelsProgressEventSchema>;

export const RecordingStartRequestSchema = z.object({});
export type RecordingStartRequest = z.infer<typeof RecordingStartRequestSchema>;

export const RecordingStopRequestSchema = z.object({});
export type RecordingStopRequest = z.infer<typeof RecordingStopRequestSchema>;

export const RecordingStartResponseSchema = z.object({
  started: z.boolean(),
  sampleRate: z.number().int().positive(),
  error: z.string().optional(),
});
export type RecordingStartResponse = z.infer<typeof RecordingStartResponseSchema>;

/**
 * Sent alongside an ArrayBuffer of Float32 PCM samples (mono) via
 * webContents.send(IPC_CHANNELS.audioFrame, { sampleRate, samples: ArrayBuffer }).
 * The samples are zero-copy-friendly (the ArrayBuffer is structured-cloned).
 */
export const AudioFrameEventSchema = z.object({
  sampleRate: z.number().int().positive(),
});
export type AudioFrameEvent = z.infer<typeof AudioFrameEventSchema>;

export const NotchSetPillHoverRequestSchema = z.object({ isHovering: z.boolean() });
export type NotchSetPillHoverRequest = z.infer<typeof NotchSetPillHoverRequestSchema>;

export const HotkeyModifierSchema = z.enum(['cmd', 'ctrl', 'alt', 'shift']);
export type HotkeyModifier = z.infer<typeof HotkeyModifierSchema>;

export const HotkeyComboSchema = z.object({
  modifiers: z.array(HotkeyModifierSchema),
  key: z.string(),
});
export type HotkeyCombo = z.infer<typeof HotkeyComboSchema>;

export const HotkeyCaptureKeyEventSchema = z.object({
  modifiers: z.array(HotkeyModifierSchema),
  key: z.string(),
  // True when at least one non-modifier key is pressed — signals "complete combo".
  hasKey: z.boolean(),
});
export type HotkeyCaptureKeyEvent = z.infer<typeof HotkeyCaptureKeyEventSchema>;

export const RecordingTriggerEventSchema = z.object({
  kind: z.enum(['start', 'stop']),
});
export type RecordingTriggerEvent = z.infer<typeof RecordingTriggerEventSchema>;

export const InjectTextRequestSchema = z.object({ text: z.string() });
export type InjectTextRequest = z.infer<typeof InjectTextRequestSchema>;

export const InjectionMethodSchema = z.enum(['paste', 'simType']);
export type InjectionMethod = z.infer<typeof InjectionMethodSchema>;

export const PermissionStatusSchema = z.enum(['authorized', 'denied', 'not-determined']);
export type PermissionStatus = z.infer<typeof PermissionStatusSchema>;

export const PermissionsStatusResponseSchema = z.object({
  microphone: PermissionStatusSchema,
  accessibility: PermissionStatusSchema,
});
export type PermissionsStatusResponse = z.infer<typeof PermissionsStatusResponseSchema>;

export const PermissionsOpenRequestSchema = z.object({
  kind: z.enum(['microphone', 'accessibility']),
});
export type PermissionsOpenRequest = z.infer<typeof PermissionsOpenRequestSchema>;

export const IPC_CHANNELS = {
  dbQuery: 'db.query',
  dbMutate: 'db.mutate',
  dbChange: 'db.change',
  modelsListCatalog: 'models.listCatalog',
  modelsDownloadStart: 'models.download.start',
  modelsDownloadCancel: 'models.download.cancel',
  modelsDelete: 'models.delete',
  modelsProgress: 'models.progress',
  recordingStart: 'recording.start',
  recordingStop: 'recording.stop',
  audioFrame: 'audio.frame',
  notchFollowActiveDisplay: 'notch.followActiveDisplay',
  notchSetPillHover: 'notch.setPillHover',
  hotkeyCaptureStart: 'hotkey.capture.start',
  hotkeyCaptureEnd: 'hotkey.capture.end',
  hotkeyCaptureKey: 'hotkey.capture.key',
  recordingTrigger: 'recording.trigger',
  injectText: 'inject.text',
  permissionsStatus: 'permissions.status',
  permissionsOpen: 'permissions.open',
} as const;

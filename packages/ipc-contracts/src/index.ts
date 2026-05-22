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

export const IPC_CHANNELS = {
  dbQuery: 'db.query',
  dbMutate: 'db.mutate',
  dbChange: 'db.change',
} as const;

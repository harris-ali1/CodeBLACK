import type { IncomingMessage, ServerResponse } from "node:http";

export const REPLAY_START: string;
export const REPLAY_HOURS: number;
export function loadReplay(databaseUrl: string): Promise<unknown>;
export function berylMiddleware(
  databaseUrl: string | undefined,
): (req: IncomingMessage, res: ServerResponse) => Promise<void>;

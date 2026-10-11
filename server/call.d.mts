import type { IncomingMessage, ServerResponse } from "node:http";

export function createCaller(env: Record<string, string | undefined>): {
  middleware: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
  configured: boolean;
};

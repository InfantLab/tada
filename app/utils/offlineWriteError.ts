export class OfflineWriteError extends Error {
  code = "OFFLINE_WRITE" as const;
  constructor(method: string, path: string) {
    super(`Offline — ${method} ${path} will need to wait for connection.`);
  }
}

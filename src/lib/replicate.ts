import { getPreferenceValues } from "@raycast/api";
import { writeFile } from "node:fs/promises";

const API_BASE = "https://api.replicate.com/v1";

export class ReplicateError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ReplicateError";
    this.status = status;
  }
}

export const isAuthError = (error: unknown) =>
  error instanceof ReplicateError && (error.status === 401 || error.status === 403);

export const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

export const replicateFetch = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const { token } = getPreferenceValues<Preferences>();
  const response = await fetch(path.startsWith("http") ? path : `${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const body = await response.text();
  let data: unknown;
  try {
    data = body ? JSON.parse(body) : undefined;
  } catch {
    // Gateway and rate-limit errors arrive as HTML, so only the status is usable.
  }

  if (!response.ok) {
    const detail = (data as { detail?: string } | undefined)?.detail;
    throw new ReplicateError(response.status, detail ?? `${response.status} ${response.statusText}`);
  }

  return data as T;
};

export const downloadFile = async (url: string, destination: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new ReplicateError(response.status, `Download failed with ${response.status} ${response.statusText}`);
  }
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
  return destination;
};

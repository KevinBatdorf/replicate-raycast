import { getPreferenceValues } from "@raycast/api";
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { CollectionResponse, CollectionsResponse, Model, Prediction, ReplicateFile, SearchResponse } from "../types";
import { isRunning } from "../utils/status";

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

export const cancelPrediction = (id: string) =>
  replicateFetch<unknown>(`/predictions/${id}/cancel`, { method: "POST" });

// Replicate publishes forty-odd collections; these are the ones worth reaching first.
export const MAIN_COLLECTIONS = [
  "text-to-image",
  "image-editing",
  "language-models",
  "text-to-video",
  "upscale-images",
  "audio-generation",
];

export const modelId = (model: Pick<Model, "owner" | "name">) => `${model.owner}/${model.name}`;

// The API only sorts models by date, so the most-run list is pooled from the main collections.
export const listModels = async () => {
  const lists = await Promise.all(MAIN_COLLECTIONS.map((slug) => collectionModels(slug).catch(() => [])));
  const unique = new Map(lists.flat().map((model) => [modelId(model), model]));
  return [...unique.values()].sort(byRunCount);
};

const byRunCount = (first: Model, second: Model) => (second.run_count ?? 0) - (first.run_count ?? 0);

export const listCollections = async () => (await replicateFetch<CollectionsResponse>("/collections")).results;

export const collectionModels = async (slug: string) => {
  const collection = await replicateFetch<CollectionResponse>(`/collections/${slug}`);
  return (collection.models ?? []).sort(byRunCount);
};

export const searchModels = async (query: string) => {
  const response = await replicateFetch<SearchResponse>(`/search?query=${encodeURIComponent(query)}&limit=20`);
  return (response.models ?? []).map((result) => result.model);
};

export const getModel = (owner: string, name: string) => replicateFetch<Model>(`/models/${owner}/${name}`);

export const createPrediction = ({
  owner,
  name,
  version,
  official,
  input,
  wait,
}: {
  owner: string;
  name: string;
  version?: string;
  official?: boolean;
  input: Record<string, unknown>;
  wait?: number;
}) => {
  // Official models can still list a latest version, but they run and bill on their own endpoint.
  const pinned = version && !official;
  return replicateFetch<Prediction>(pinned ? "/predictions" : `/models/${owner}/${name}/predictions`, {
    method: "POST",
    headers: wait ? { Prefer: `wait=${wait}` } : undefined,
    body: JSON.stringify({ ...(pinned ? { version } : {}), input }),
  });
};

export const uploadBytes = async (bytes: Buffer, filename: string, type?: string) => {
  const { token } = getPreferenceValues<Preferences>();
  const body = new FormData();
  body.append("content", new Blob([bytes], type ? { type } : undefined), filename);

  const response = await fetch(`${API_BASE}/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  if (!response.ok) {
    throw new ReplicateError(response.status, `Uploading ${filename} failed with ${response.status}.`);
  }

  const file = (await response.json()) as ReplicateFile;
  if (!file.urls?.get) throw new ReplicateError(response.status, "The upload returned no file URL.");
  return file.urls.get;
};

export const uploadFile = async (path: string) => uploadBytes(await readFile(path), basename(path));

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 180_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const waitForPrediction = async (initial: Prediction) => {
  let prediction = initial;
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (isRunning(prediction)) {
    if (Date.now() > deadline) {
      throw new Error(
        `The prediction is still running. Check it at https://replicate.com/p/${prediction.id} and try a faster model.`,
      );
    }
    await sleep(POLL_INTERVAL_MS);
    prediction = await replicateFetch<Prediction>(`/predictions/${prediction.id}`);
  }
  return prediction;
};

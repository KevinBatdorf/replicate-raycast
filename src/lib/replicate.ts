import { getPreferenceValues } from "@raycast/api";
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import {
  CollectionResponse,
  CollectionsResponse,
  Model,
  ModelsResponse,
  Prediction,
  ReplicateFile,
  SearchResponse,
} from "../types";

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

const MODEL_PAGES = 3;

// The API only sorts models by creation date, so popularity has to be sorted here.
export const listModels = async () => {
  const models: Model[] = [];
  let path: string | undefined = "/models";

  for (let page = 0; page < MODEL_PAGES && path; page += 1) {
    const response: ModelsResponse = await replicateFetch<ModelsResponse>(path);
    models.push(...response.results);
    path = response.next ?? undefined;
  }

  return models.sort(byRunCount);
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
  input,
  wait,
}: {
  owner: string;
  name: string;
  version?: string;
  input: Record<string, unknown>;
  wait?: number;
}) =>
  // Official models have no version to pin and only run on their own endpoint.
  replicateFetch<Prediction>(version ? "/predictions" : `/models/${owner}/${name}/predictions`, {
    method: "POST",
    headers: wait ? { Prefer: `wait=${wait}` } : undefined,
    body: JSON.stringify({ ...(version ? { version } : {}), input }),
  });

export const uploadFile = async (path: string) => {
  const { token } = getPreferenceValues<Preferences>();
  const body = new FormData();
  body.append("content", new Blob([await readFile(path)]), basename(path));

  const response = await fetch(`${API_BASE}/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  if (!response.ok) {
    throw new ReplicateError(response.status, `Uploading ${basename(path)} failed with ${response.status}.`);
  }

  const file = (await response.json()) as ReplicateFile;
  if (!file.urls?.get) throw new ReplicateError(response.status, "The upload returned no file URL.");
  return file.urls.get;
};

import { Tool, environment, getPreferenceValues } from "@raycast/api";
import { mkdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { downloadFile, replicateFetch } from "../lib/replicate";
import { PredictionStatus } from "../types";
import { isRunning } from "../utils/status";

type Input = {
  /**
   * What the image should show. Pass the user's own wording; only expand it if they asked you to.
   */
  prompt: string;
  /**
   * The model to run, as `owner/name` or `owner/name:version`, e.g. `black-forest-labs/flux-schnell`.
   * Leave this out unless the user names a model, in which case the extension's default model runs.
   */
  model?: string;
  /**
   * The shape of the image, e.g. `1:1`, `16:9`, `9:16` or `3:2`. Only pass this when the user asks
   * for a shape, and only for models that accept an `aspect_ratio` input.
   */
  aspectRatio?: string;
  /**
   * How many images to generate. Defaults to one; most models refuse more than four.
   */
  count?: number;
};

type Prediction = {
  id: string;
  status: PredictionStatus;
  error?: string;
  output?: string | string[] | null;
};

const WAIT_SECONDS = 60;
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 180_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const resolveModel = (model?: string) => {
  const { defaultModel } = getPreferenceValues<Preferences>();
  const name = (model ?? defaultModel).trim().replace(/^(https?:\/\/)?replicate\.com\//, "");
  if (!/^[^/\s]+\/[^/\s]+$/.test(name)) {
    throw new Error(`"${name}" is not a Replicate model. Models are written as owner/name.`);
  }
  return name;
};

const altText = (prompt: string) => prompt.replace(/\s+/g, " ").replace(/[[\]]/g, "").trim().slice(0, 80);

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { confirmGenerations } = getPreferenceValues<Preferences>();
  if (!confirmGenerations) return undefined;

  return {
    message: "Running a model bills your Replicate account.",
    info: [
      { name: "Model", value: resolveModel(input.model) },
      { name: "Prompt", value: input.prompt },
      { name: "Aspect ratio", value: input.aspectRatio },
      { name: "Images", value: input.count && input.count > 1 ? String(input.count) : undefined },
    ],
  };
};

/**
 * Generate an image from a text prompt by running a model on Replicate.
 */
export default async function tool(input: Input) {
  const model = resolveModel(input.model);
  const [owner, name] = model.split("/");
  const [, version] = name.split(":");

  const body = JSON.stringify({
    ...(version ? { version } : {}),
    input: {
      prompt: input.prompt,
      ...(input.aspectRatio ? { aspect_ratio: input.aspectRatio } : {}),
      ...(input.count && input.count > 1 ? { num_outputs: input.count } : {}),
    },
  });

  let prediction = await replicateFetch<Prediction>(
    version ? "/predictions" : `/models/${owner}/${name}/predictions`,
    // Sync mode still returns an unfinished prediction when the wait elapses.
    { method: "POST", headers: { Prefer: `wait=${WAIT_SECONDS}` }, body },
  );

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

  if (prediction.status !== "succeeded") {
    throw new Error(prediction.error ?? `The prediction ${prediction.status}.`);
  }

  const urls = (Array.isArray(prediction.output) ? prediction.output : [prediction.output]).filter(
    (output): output is string => typeof output === "string" && output.startsWith("http"),
  );

  if (!urls.length) {
    throw new Error(`${model} did not return an image. It may not be an image model.`);
  }

  const directory = join(environment.supportPath, "generations");
  await mkdir(directory, { recursive: true });

  const images = await Promise.all(
    urls.map(async (url, index) => ({
      url,
      // Replicate deletes output files about an hour after the prediction runs.
      file: await downloadFile(url, join(directory, `${prediction.id}-${index}${extname(new URL(url).pathname)}`)),
    })),
  );

  return {
    model,
    prompt: input.prompt,
    predictionUrl: `https://replicate.com/p/${prediction.id}`,
    images,
    markdown: images.map(({ url }) => `![${altText(input.prompt)}](${url})`).join("\n\n"),
  };
}

import { saveOutputs } from "../lib/history";
import { getPrediction, waitForPrediction } from "../lib/replicate";
import { altText } from "../utils/output";
import { isRunning, logPercent } from "../utils/status";

type Input = {
  /**
   * The id start-generation returned.
   */
  id: string;
};

// Short enough that checks show as steps in the chat, long enough for fast models.
const CHECK_TIMEOUT_MS = 10_000;
const CHECK_POLL_MS = 1000;

/**
 * Check on an image started with start-generation, waiting up to ten seconds for it to finish.
 */
export default async function tool({ id }: Input) {
  const prediction = await waitForPrediction(await getPrediction(id), {
    interval: CHECK_POLL_MS,
    timeout: CHECK_TIMEOUT_MS,
  });

  if (isRunning(prediction)) {
    const percent = logPercent(prediction.logs);
    return {
      status: prediction.status,
      progress: percent ? `${percent}%` : undefined,
      instruction: "Still running. Call check-generation again with the same id now, before replying.",
    };
  }
  if (prediction.status !== "succeeded") {
    throw new Error(prediction.error ?? `The prediction ${prediction.status}.`);
  }

  const urls = (Array.isArray(prediction.output) ? prediction.output : [prediction.output]).filter(
    (output): output is string => typeof output === "string" && output.startsWith("http"),
  );
  if (!urls.length) {
    throw new Error(`${prediction.model ?? "The model"} did not return an image. It may not be an image model.`);
  }

  const alt = altText(prediction.input?.prompt ?? "");
  await saveOutputs(prediction);

  return {
    status: prediction.status,
    // The chat model has to retype this, so it stays a short link rather than an embedded image.
    markdown: urls.map((url) => `![${alt}](${url})`).join("\n\n"),
    instruction: "Reply with the markdown field exactly as given. It is the only way the user sees the image.",
    predictionUrl: `https://replicate.com/p/${id}`,
  };
}

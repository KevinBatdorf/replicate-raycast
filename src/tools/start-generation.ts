import { Tool, getPreferenceValues } from "@raycast/api";
import { createPrediction } from "../lib/replicate";

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

const resolveModel = (model?: string) => {
  const { defaultModel } = getPreferenceValues<Preferences>();
  const name = (model ?? defaultModel).trim().replace(/^(https?:\/\/)?replicate\.com\//, "");
  if (!/^[^/\s]+\/[^/\s]+$/.test(name)) {
    throw new Error(`"${name}" is not a Replicate model. Models are written as owner/name.`);
  }
  return name;
};

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
 * Start generating an image from a text prompt on Replicate. Returns at once with an id for check-generation.
 */
export default async function tool(input: Input) {
  const model = resolveModel(input.model);
  const [owner, name] = model.split("/");
  const [modelName, version] = name.split(":");

  const prediction = await createPrediction({
    owner,
    name: modelName,
    version,
    input: {
      prompt: input.prompt,
      ...(input.aspectRatio ? { aspect_ratio: input.aspectRatio } : {}),
      ...(input.count && input.count > 1 ? { num_outputs: input.count } : {}),
    },
  });

  return {
    id: prediction.id,
    status: prediction.status,
    model,
    instruction: "Tell the user in a few words that the image is on its way, then call check-generation with this id.",
  };
}

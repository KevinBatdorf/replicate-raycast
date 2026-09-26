import { Tool, getPreferenceValues } from "@raycast/api";
import { fullModel } from "../lib/ai-models";
import { chatShape } from "../lib/chat";
import { createPrediction } from "../lib/replicate";

type Input = {
  /**
   * What the image should show. Pass the user's own wording; only expand it if they asked you to.
   */
  prompt: string;
  /**
   * The model to run, as `owner/name` or `owner/name:version`, e.g. `black-forest-labs/flux-schnell`.
   * Pass the model the user named, or the one chosen from list-models.
   */
  model?: string;
  /**
   * The URL of an image to change, such as one from an earlier generation. Only for models that edit images.
   */
  image?: string;
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

const FALLBACK_MODEL = "black-forest-labs/flux-schnell";

const resolveModel = (model?: string) => {
  const { defaultModel } = getPreferenceValues<Preferences>();
  const name = (model || defaultModel?.trim() || FALLBACK_MODEL).trim().replace(/^(https?:\/\/)?replicate\.com\//, "");
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
      { name: "Image", value: input.image },
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

  // Models name their inputs differently, so the prompt and image go where this one expects them.
  const details = await fullModel(`${owner}/${modelName}`).catch(() => undefined);
  const shape = chatShape(details);
  const accepts = details?.latest_version?.openapi_schema?.components?.schemas?.Input?.properties;
  if (input.image && details && !shape?.image) {
    throw new Error(`${model} can't edit images. Pick a model from list-models that edits images.`);
  }
  if (!input.image && shape?.image?.required) {
    throw new Error(`${model} edits an existing image. Pass the image's URL as image.`);
  }

  const prediction = await createPrediction({
    owner,
    name: modelName,
    version,
    official: details?.is_official,
    input: {
      [shape?.prompt ?? "prompt"]: input.prompt,
      ...(input.image && shape?.image
        ? { [shape.image.name]: shape.image.multiple ? [input.image] : input.image }
        : {}),
      ...(input.aspectRatio && (!accepts || accepts.aspect_ratio) ? { aspect_ratio: input.aspectRatio } : {}),
      ...(input.count && input.count > 1 && (!accepts || accepts.num_outputs) ? { num_outputs: input.count } : {}),
    },
  });

  return {
    id: prediction.id,
    status: prediction.status,
    model,
    instruction:
      "Call check-generation with this id now, before replying. Replying ends your turn and leaves the image unfinished.",
  };
}

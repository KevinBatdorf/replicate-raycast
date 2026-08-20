import isImage from "is-image";
import { extname } from "node:path";
import { Prediction } from "../types";

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v"];
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac"];

export type OutputItem = { kind: "image" | "video" | "audio" | "file"; url: string } | { kind: "text"; text: string };

const asUrl = (value: string) => {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
};

const classify = (value: unknown): OutputItem | undefined => {
  if (typeof value === "string") {
    const url = asUrl(value);
    if (!url) return { kind: "text", text: value };
    // is-image reads everything past the last dot, so a signed URL's query breaks it.
    const path = url.pathname;
    const extension = extname(path).toLowerCase();
    if (isImage(path)) return { kind: "image", url: value };
    if (VIDEO_EXTENSIONS.includes(extension)) return { kind: "video", url: value };
    if (AUDIO_EXTENSIONS.includes(extension)) return { kind: "audio", url: value };
    return { kind: "file", url: value };
  }
  if (value === null || value === undefined) return undefined;
  return { kind: "text", text: JSON.stringify(value, null, 2) };
};

export const outputItems = (output: Prediction["output"]): OutputItem[] => {
  // Language models stream one array entry per token.
  if (Array.isArray(output) && output.length && output.every((entry) => typeof entry === "string" && !asUrl(entry))) {
    return [{ kind: "text", text: output.join("") }];
  }
  const values = Array.isArray(output) ? output : [output];
  return values.map(classify).filter((item): item is OutputItem => Boolean(item));
};

export const firstImage = (items: OutputItem[]) => {
  const image = items.find((item) => item.kind === "image");
  return image && "url" in image ? image.url : undefined;
};

export const outputMarkdown = (prediction: Prediction, items: OutputItem[]) => {
  const prompt = prediction.input?.prompt?.trim();
  const heading = prompt ? `### ${prompt}\n\n` : "";

  if (!items.length) {
    const reason =
      prediction.status === "succeeded"
        ? "This prediction has no output any more. Replicate removes outputs about an hour after a prediction runs."
        : (prediction.error ?? `This prediction ${prediction.status}.`);
    return `${heading}${reason}`;
  }

  const body = items
    .map((item) => {
      if (item.kind === "image") return `![${prompt ?? ""}](${item.url})`;
      if (item.kind === "text") return `\`\`\`\n${item.text}\n\`\`\``;
      return `[${item.kind === "file" ? "Open file" : `Play ${item.kind}`}](${item.url})`;
    })
    .join("\n\n");

  return `${heading}${body}`;
};

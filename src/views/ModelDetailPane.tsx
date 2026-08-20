import { List } from "@raycast/api";
import { Model } from "../types";
import { formatRuns } from "../utils/format";
import { firstImage, outputItems } from "../utils/output";

const IMAGE_WIDTH = 200;

// Raycast sizes markdown images through query params, and delivery URLs are already signed.
const sized = (url: string) => `${url}${url.includes("?") ? "&" : "?"}raycast-width=${IMAGE_WIDTH}`;

const exampleImage = (model?: Model) => {
  const example = model?.default_example;
  return example ? firstImage(outputItems(example.output)) : undefined;
};

type Props = {
  model: Model;
  full?: Model;
};
export const ModelDetailPane = ({ model, full }: Props) => {
  const details = full ?? model;
  const image = exampleImage(full) ?? details.cover_image_url ?? undefined;
  const prompt = full?.default_example?.input?.prompt?.trim();

  const links = [
    details.github_url ? `[Source](${details.github_url})` : undefined,
    details.paper_url ? `[Paper](${details.paper_url})` : undefined,
    details.license_url ? `[Licence](${details.license_url})` : undefined,
  ].filter(Boolean);

  const markdown = [
    image ? `![${details.name}](${sized(image)})` : undefined,
    details.description,
    formatRuns(details.run_count),
    prompt ? `**Example prompt** — ${prompt}` : undefined,
    links.length ? links.join("  ·  ") : undefined,
  ]
    .filter(Boolean)
    .join("\n\n");

  return <List.Item.Detail markdown={markdown} />;
};

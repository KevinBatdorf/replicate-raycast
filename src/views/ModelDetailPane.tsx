import { List } from "@raycast/api";
import { Model } from "../types";
import { formatRuns } from "../utils/format";
import { firstImage, outputItems } from "../utils/output";

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
  const runs = formatRuns(details.run_count);

  const markdown = [
    image ? `![${details.name}](${image})` : undefined,
    details.description,
    prompt ? `**Example prompt** — ${prompt}` : undefined,
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <List.Item.Detail
      markdown={markdown || "No description."}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Owner" text={details.owner} />
          {runs && <List.Item.Detail.Metadata.Label title="Popularity" text={runs} />}
          <List.Item.Detail.Metadata.Label
            title="Runs on"
            text={details.latest_version ? "A pinned version" : "The model endpoint"}
          />
          {details.github_url && (
            <List.Item.Detail.Metadata.Link title="Source" text="GitHub" target={details.github_url} />
          )}
          {details.paper_url && <List.Item.Detail.Metadata.Link title="Paper" text="Read" target={details.paper_url} />}
          {details.license_url && (
            <List.Item.Detail.Metadata.Link title="License" text="Terms" target={details.license_url} />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
};

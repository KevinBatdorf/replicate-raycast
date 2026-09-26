import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { useAIModels } from "../hooks/useAIModels";
import { useModel } from "../hooks/useModel";
import { chatShape } from "../lib/chat";
import { formatAgo, formatRuns } from "../utils/format";
import { firstImage, outputItems } from "../utils/output";
import { ModelForm } from "./ModelForm";

type Status = "kept" | "popular" | "hidden" | "none";

const STATUS_TAGS: Record<Status, { text: string; color: Color }> = {
  kept: { text: "In Raycast AI", color: Color.Green },
  popular: { text: "Popular", color: Color.Blue },
  hidden: { text: "Hidden", color: Color.SecondaryText },
  none: { text: "Not Added", color: Color.SecondaryText },
};

const statusOf = (id: string, { kept, hidden, popular }: Record<"kept" | "hidden" | "popular", string[]>) => {
  if (kept.includes(id)) return "kept";
  if (hidden.includes(id)) return "hidden";
  if (popular.includes(id)) return "popular";
  return "none";
};

type Props = {
  id: string;
  popular: string[];
};
export const AIModelDetail = ({ id, popular }: Props) => {
  const { data: model, isLoading } = useModel(id);
  const { kept, keptIds, hidden, isLoading: loadingState, add, remove, hide, unhide } = useAIModels();
  const status: Status = statusOf(id, { kept: keptIds, hidden, popular });
  const saved = kept.find((entry) => entry.id === id);
  const shape = chatShape(model);

  const example = model?.default_example;
  const image = (example ? firstImage(outputItems(example.output)) : undefined) ?? model?.cover_image_url;
  const prompt = example?.input?.prompt?.trim();
  const markdown = [
    image ? `![${model?.name ?? id}](${image})` : undefined,
    model?.description,
    prompt ? `**Example prompt** — ${prompt}` : undefined,
  ]
    .filter(Boolean)
    .join("\n\n");

  const runs = formatRuns(model?.run_count);

  return (
    <Detail
      isLoading={isLoading || loadingState}
      navigationTitle={id}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Raycast AI">
            <Detail.Metadata.TagList.Item text={STATUS_TAGS[status].text} color={STATUS_TAGS[status].color} />
          </Detail.Metadata.TagList>
          {saved?.usedAt && <Detail.Metadata.Label title="Last Used" text={formatAgo(saved.usedAt)} />}
          {saved?.addedAt && <Detail.Metadata.Label title="Added" text={formatAgo(saved.addedAt)} />}
          {model && (
            <Detail.Metadata.Label
              title="Replies With"
              text={shape ? (shape.output === "image" ? "Images" : "Text") : "Output a chat can't show"}
            />
          )}
          {shape && (
            <Detail.Metadata.Label
              title="Attached Images"
              text={shape.image ? (shape.image.required ? "Required" : "Used when present") : "Ignored"}
            />
          )}
          {runs && <Detail.Metadata.Label title="Runs" text={runs} />}
          {model?.is_official && (
            <Detail.Metadata.TagList title="Replicate">
              <Detail.Metadata.TagList.Item text="Official" color={Color.Purple} />
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Model" text={id} target={`https://replicate.com/${id}`} />
          {model?.github_url && <Detail.Metadata.Link title="Source" text="GitHub" target={model.github_url} />}
          {model?.paper_url && <Detail.Metadata.Link title="Paper" text="Read" target={model.paper_url} />}
          {model?.license_url && <Detail.Metadata.Link title="Licence" text="View" target={model.license_url} />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {status === "kept" && (
            <Action icon={Icon.MinusCircle} title="Remove from Raycast AI" onAction={() => remove(id)} />
          )}
          {status === "popular" && (
            <>
              <Action icon={Icon.EyeDisabled} title="Hide from Raycast AI" onAction={() => hide(id)} />
              <Action icon={Icon.Pin} title="Keep in Raycast AI" onAction={() => add(id)} />
            </>
          )}
          {status === "hidden" && <Action icon={Icon.Eye} title="Show in Raycast AI" onAction={() => unhide(id)} />}
          {status === "none" && shape && (
            <Action icon={Icon.PlusCircle} title="Add to Raycast AI" onAction={() => add(id)} />
          )}
          {model && <Action.Push icon={Icon.Play} title="Configure Inputs" target={<ModelForm model={model} />} />}
          <Action.OpenInBrowser icon={Icon.Globe} title="Open on Replicate" url={`https://replicate.com/${id}`} />
          <Action.CopyToClipboard icon={Icon.Text} title="Copy Model Name" content={id} />
        </ActionPanel>
      }
    />
  );
};

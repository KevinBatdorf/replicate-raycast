import { useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Model } from "../types";
import { useCollections } from "../hooks/useCollections";
import { useModel } from "../hooks/useModel";
import { useModels } from "../hooks/useModels";
import { modelId, useRecentModels } from "../hooks/useRecentModels";
import { formatRuns } from "../utils/format";
import { ModelDetailPane } from "./ModelDetailPane";
import { ModelForm } from "./ModelForm";

// Replicate publishes forty-odd collections; these are the ones worth reaching first.
const PINNED_COLLECTIONS = [
  "text-to-image",
  "image-editing",
  "language-models",
  "text-to-video",
  "upscale-images",
  "audio-generation",
];

export const ModelList = () => {
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const { data: models, isLoading } = useModels(query, collection);
  const { data: collections } = useCollections();
  const { recents, remember } = useRecentModels();
  const { data: full } = useModel(selected ?? undefined);

  const searching = Boolean(query.trim());
  const recentIds = new Set(recents.map(modelId));
  const shown = searching ? models : models.filter((model) => !recentIds.has(modelId(model)));
  const pinned = searching ? [] : recents;

  const item = (model: Model) => {
    const id = modelId(model);
    const runs = formatRuns(model.run_count);
    const example = selected === id ? full?.default_example?.input?.prompt?.trim() : undefined;
    return (
      <List.Item
        key={id}
        id={id}
        icon={model.cover_image_url ?? Icon.Box}
        title={id}
        accessories={runs ? [{ text: runs }] : undefined}
        detail={<ModelDetailPane model={model} full={selected === id ? full : undefined} />}
        actions={
          <ActionPanel>
            <Action.Push
              icon={Icon.Play}
              title="Configure Inputs"
              target={<ModelForm model={model} onOpen={remember} />}
            />
            <Action.OpenInBrowser icon={Icon.Globe} title="Open on Replicate" url={`https://replicate.com/${id}`} />
            <Action.CopyToClipboard icon={Icon.Text} title="Copy Model Name" content={id} />
            {example && <Action.CopyToClipboard icon={Icon.Paragraph} title="Copy Example Prompt" content={example} />}
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      onSelectionChange={setSelected}
      throttle
      searchBarPlaceholder="Search Replicate models"
      searchBarAccessory={
        <List.Dropdown tooltip="Collection" storeValue onChange={setCollection}>
          <List.Dropdown.Item title="Most Run" value="" />
          {[...collections]
            .sort((first, second) => {
              const rank = (slug: string) => {
                const index = PINNED_COLLECTIONS.indexOf(slug);
                return index === -1 ? PINNED_COLLECTIONS.length : index;
              };
              return rank(first.slug) - rank(second.slug) || first.name.localeCompare(second.name);
            })
            .map((entry) => (
              <List.Dropdown.Item key={entry.slug} title={entry.name} value={entry.slug} />
            ))}
        </List.Dropdown>
      }
    >
      {pinned.length > 0 && <List.Section title="Recent">{pinned.map(item)}</List.Section>}
      <List.Section
        title={searching ? "Results" : (collections.find((c) => c.slug === collection)?.name ?? "Most Run")}
      >
        {shown.map(item)}
      </List.Section>
    </List>
  );
};

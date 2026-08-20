import { useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCollections } from "../hooks/useCollections";
import { useModels } from "../hooks/useModels";
import { formatRuns } from "../utils/format";
import { ModelForm } from "./ModelForm";

export const ModelList = () => {
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState("");
  const { data: models, isLoading } = useModels(query, collection);
  const { data: collections } = useCollections();

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      throttle
      searchBarPlaceholder="Search Replicate models"
      searchBarAccessory={
        <List.Dropdown tooltip="Collection" storeValue onChange={setCollection}>
          <List.Dropdown.Item title="Most Run" value="" />
          {collections.map((entry) => (
            <List.Dropdown.Item key={entry.slug} title={entry.name} value={entry.slug} />
          ))}
        </List.Dropdown>
      }
    >
      {models.map((model) => {
        const id = `${model.owner}/${model.name}`;
        const runs = formatRuns(model.run_count);
        return (
          <List.Item
            key={id}
            icon={model.cover_image_url ?? Icon.Box}
            title={id}
            subtitle={model.description}
            accessories={runs ? [{ text: runs }] : undefined}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Play} title="Configure Inputs" target={<ModelForm model={model} />} />
                <Action.OpenInBrowser icon={Icon.Globe} title="Open on Replicate" url={`https://replicate.com/${id}`} />
                <Action.CopyToClipboard icon={Icon.Text} title="Copy Model Name" content={id} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
};

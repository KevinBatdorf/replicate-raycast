import { Action, ActionPanel, getPreferenceValues, Icon, List, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ReactElement } from "react";
import { useAIModels } from "../hooks/useAIModels";
import { fullModel, popularModelIds } from "../lib/ai-models";
import { Model } from "../types";
import { ModelList } from "./ModelList";

const loadDetails = async (ids: string[]) => {
  const models = await Promise.all(ids.map((id) => fullModel(id).catch(() => undefined)));
  return Object.fromEntries(ids.map((id, index) => [id, models[index]])) as Record<string, Model | undefined>;
};

export const ManageAIModels = () => {
  const { popularModels } = getPreferenceValues<Preferences>();
  const { added, hidden, isLoading, revalidate, add, remove, hide, unhide } = useAIModels();
  const { data: popular = [], isLoading: loadingPopular } = usePromise(popularModelIds, [], {
    execute: popularModels,
  });

  const shownPopular = popularModels ? popular.filter((id) => !added.includes(id) && !hidden.includes(id)) : [];
  const { data: details = {} } = usePromise(loadDetails, [[...added, ...shownPopular, ...hidden]]);

  const browse = (
    <Action.Push icon={Icon.MagnifyingGlass} title="Browse Models" target={<ModelList />} onPop={revalidate} />
  );
  const common = (id: string) => (
    <>
      {browse}
      <Action.OpenInBrowser icon={Icon.Globe} title="Open on Replicate" url={`https://replicate.com/${id}`} />
      <Action.CopyToClipboard icon={Icon.Text} title="Copy Model Name" content={id} />
    </>
  );

  const item = (id: string, actions: ReactElement) => {
    const model = details[id];
    return (
      <List.Item
        key={id}
        icon={model?.cover_image_url ?? Icon.Box}
        title={id}
        subtitle={model?.description}
        accessories={model?.is_official ? [{ tag: "Official" }] : undefined}
        actions={actions}
      />
    );
  };

  return (
    <List
      isLoading={isLoading || loadingPopular}
      navigationTitle="Manage AI Models"
      searchBarPlaceholder="Filter models in Raycast AI"
      actions={
        <ActionPanel>
          {browse}
          <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={Icon.Stars}
        title="No Models in Raycast AI"
        description="Browse Replicate's models and add the ones you want in the model picker."
        actions={<ActionPanel>{browse}</ActionPanel>}
      />
      <List.Section title="Added by You" subtitle="Stay until you remove them">
        {added.map((id) =>
          item(
            id,
            <ActionPanel>
              <Action icon={Icon.MinusCircle} title="Remove from Raycast AI" onAction={() => remove(id)} />
              {common(id)}
            </ActionPanel>,
          ),
        )}
      </List.Section>
      <List.Section title="Popular" subtitle="Refreshed daily">
        {shownPopular.map((id) =>
          item(
            id,
            <ActionPanel>
              <Action icon={Icon.EyeDisabled} title="Hide from Raycast AI" onAction={() => hide(id)} />
              <Action icon={Icon.Pin} title="Keep in Raycast AI" onAction={() => add(id)} />
              {common(id)}
            </ActionPanel>,
          ),
        )}
      </List.Section>
      <List.Section title="Hidden">
        {hidden.map((id) =>
          item(
            id,
            <ActionPanel>
              <Action icon={Icon.Eye} title="Show in Raycast AI" onAction={() => unhide(id)} />
              {common(id)}
            </ActionPanel>,
          ),
        )}
      </List.Section>
    </List>
  );
};

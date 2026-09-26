import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ReactElement, useState } from "react";
import { useAIModels } from "../hooks/useAIModels";
import { fullModel, popularModelIds } from "../lib/ai-models";
import { chatShape } from "../lib/chat";
import { errorMessage, modelId, searchModels } from "../lib/replicate";
import { Model } from "../types";
import { AIModelDetail } from "./AIModelDetail";
import { ModelList } from "./ModelList";

const loadDetails = async (ids: string[]) => {
  const models = await Promise.all(ids.map((id) => fullModel(id).catch(() => undefined)));
  return Object.fromEntries(ids.map((id, index) => [id, models[index]])) as Record<string, Model | undefined>;
};

export const ManageAIModels = () => {
  const [query, setQuery] = useState("");
  const { popularModels } = getPreferenceValues<Preferences>();
  const { added, hidden, isLoading, revalidate, add, remove, hide, unhide } = useAIModels();
  const { data: popular = [], isLoading: loadingPopular } = usePromise(popularModelIds, [], {
    execute: popularModels,
  });

  const popularIds = popularModels ? popular : [];
  const shownPopular = popularIds.filter((id) => !added.includes(id) && !hidden.includes(id));
  const listed = [...added, ...shownPopular, ...hidden];
  const { data: details = {} } = usePromise(loadDetails, [listed]);

  const search = query.trim();
  const { data: results = [], isLoading: searching } = usePromise(searchModels, [search], {
    execute: Boolean(search),
  });
  const found = search ? results.filter((model) => !listed.includes(modelId(model))) : [];

  const needle = search.toLowerCase();
  const matches = (id: string) =>
    !needle || id.toLowerCase().includes(needle) || Boolean(details[id]?.description?.toLowerCase().includes(needle));

  const addResult = async (id: string) => {
    try {
      if (!chatShape(await fullModel(id))) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Can't Add to Raycast AI",
          message: `${id} returns output that a chat can't show, such as video or audio.`,
        });
        return;
      }
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could Not Load the Model", message: errorMessage(error) });
      return;
    }
    await add(id);
  };

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

  const item = (id: string, model: Model | undefined, actions: ReactElement) => (
    <List.Item
      key={id}
      icon={model?.cover_image_url ?? Icon.Box}
      title={id}
      subtitle={model?.description}
      accessories={model?.is_official ? [{ tag: "Official" }] : undefined}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Sidebar}
            title="Show Details"
            target={<AIModelDetail id={id} popular={popularIds} />}
            onPop={revalidate}
          />
          {actions}
          {common(id)}
        </ActionPanel>
      }
    />
  );

  return (
    <List
      isLoading={isLoading || loadingPopular || searching}
      navigationTitle="Manage AI Models"
      searchBarPlaceholder="Search Replicate models"
      onSearchTextChange={setQuery}
      throttle
      actions={
        <ActionPanel>
          {browse}
          <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={Icon.Stars}
        title={search ? "No Models Found" : "No Models in Raycast AI"}
        description={
          search
            ? "Try a different search, or browse Replicate's collections."
            : "Search Replicate's models and add the ones you want in the model picker."
        }
        actions={<ActionPanel>{browse}</ActionPanel>}
      />
      <List.Section title="Added by You" subtitle="Stay until you remove them">
        {added
          .filter(matches)
          .map((id) =>
            item(
              id,
              details[id],
              <Action icon={Icon.MinusCircle} title="Remove from Raycast AI" onAction={() => remove(id)} />,
            ),
          )}
      </List.Section>
      <List.Section title="Popular" subtitle="Refreshed daily">
        {shownPopular.filter(matches).map((id) =>
          item(
            id,
            details[id],
            <>
              <Action icon={Icon.EyeDisabled} title="Hide from Raycast AI" onAction={() => hide(id)} />
              <Action icon={Icon.Pin} title="Keep in Raycast AI" onAction={() => add(id)} />
            </>,
          ),
        )}
      </List.Section>
      <List.Section title="Hidden">
        {hidden
          .filter(matches)
          .map((id) =>
            item(id, details[id], <Action icon={Icon.Eye} title="Show in Raycast AI" onAction={() => unhide(id)} />),
          )}
      </List.Section>
      <List.Section title="Replicate">
        {found.map((model) => {
          const id = modelId(model);
          return item(
            id,
            model,
            <Action icon={Icon.PlusCircle} title="Add to Raycast AI" onAction={() => addResult(id)} />,
          );
        })}
      </List.Section>
    </List>
  );
};

import { useState } from "react";
import { Action, ActionPanel, Color, Icon, List, openCommandPreferences } from "@raycast/api";
import { Prediction } from "../types";
import { firstImage, outputItems } from "../utils/output";
import { STATUS_COLORS } from "../utils/status";
import { PredictionActions } from "./PredictionActions";
import { PredictionDetail } from "./PredictionDetail";

type Props = {
  predictions?: Prediction[];
  isLoading: boolean;
  error?: Error;
  pagination?: List.Props["pagination"];
  revalidate: () => void;
};
export const PredictionList = ({ predictions, isLoading, error, pagination, revalidate }: Props) => {
  const [selected, setSelected] = useState<string | null>(null);

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Could Not Load Predictions"
          description={error.message}
          actions={
            <ActionPanel>
              <Action icon={Icon.Gear} title="Update Token" onAction={openCommandPreferences} />
              <Action icon={Icon.ArrowClockwise} title="Try Again" onAction={revalidate} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      selectedItemId={selected ?? undefined}
      onSelectionChange={setSelected}
      searchBarPlaceholder="Search your prompts"
    >
      <List.EmptyView
        icon={{ source: "🚀" }}
        title="No Predictions Found"
        description="Replicate removes prediction outputs about an hour after they run, so older predictions show up empty. Find models to run at replicate.com/explore"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser icon={Icon.Globe} url="https://replicate.com/explore" />
          </ActionPanel>
        }
      />
      {predictions?.map((prediction) => {
        const items = outputItems(prediction.output);
        const image = firstImage(items);
        const prompt = prediction.input?.prompt?.trim();

        return (
          <List.Item
            key={prediction.id}
            icon={{ source: image ?? Icon.Image, tintColor: image ? undefined : Color.SecondaryText }}
            title={prompt || prediction.model || prediction.id}
            keywords={[prediction.model ?? "", prediction.status]}
            accessories={[{ tag: { value: prediction.status, color: STATUS_COLORS[prediction.status] } }]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Sidebar}
                  title="View Prediction"
                  target={<PredictionDetail id={prediction.id} initial={prediction} />}
                />
                <PredictionActions prediction={prediction} items={items} revalidate={revalidate} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
};

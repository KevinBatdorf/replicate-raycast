import { useState } from "react";
import { ActionPanel, Action, Grid, Icon, List, openCommandPreferences } from "@raycast/api";
import { Prediction } from "../types";
import { copyImage, saveImage } from "../utils/helpers";
import { Single } from "./Single";

type Props = {
  predictions?: Prediction[];
  isLoading: boolean;
  error?: Error;
  pagination?: Grid.Props["pagination"];
  onSearchTextChange?: (search: string) => void;
};
export const GridView = ({ predictions, isLoading, error, pagination, onSearchTextChange }: Props) => {
  const [columns, setColumns] = useState("6");

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: "⚠️" }}
          title="Error"
          description={error.message}
          actions={
            <ActionPanel>
              <Action icon={Icon.Gear} title="Update Token" onAction={openCommandPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }
  if (predictions && predictions.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: "🚀" }}
          title="No Predictions found"
          description="Replicate removes prediction outputs about an hour after they run, so older predictions don't show up here. Find models to run at replicate.com/explore"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser icon={Icon.Globe} url="https://replicate.com/explore" />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <Grid
      onSearchTextChange={onSearchTextChange}
      columns={Number(columns)}
      inset={undefined}
      searchBarPlaceholder="Search your prompts"
      isLoading={isLoading}
      pagination={pagination}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Select image size" storeValue={true} defaultValue={columns} onChange={setColumns}>
          <Grid.Dropdown.Item title="Large" value="4" />
          <Grid.Dropdown.Item title="Medium" value="6" />
          <Grid.Dropdown.Item title="Small" value="8" />
        </Grid.Dropdown>
      }
    >
      {predictions?.map((prediction) => {
        const { id, input, output } = prediction;
        return (
          <Grid.Item
            key={id}
            content={{
              value: { source: output[0] },
              tooltip: input?.prompt?.trim() ?? "",
            }}
            title={input?.prompt?.trim() ?? ""}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Sidebar} title="View" target={<Single prediction={prediction} />} />
                <Action icon={Icon.SaveDocument} title="Save Image" onAction={() => saveImage(output[0])} />
                <Action icon={Icon.CopyClipboard} title="Copy Image" onAction={() => copyImage(output[0])} />
                <Action.OpenInBrowser
                  icon={Icon.Globe}
                  title="Open on Replicate"
                  url={`https://replicate.com/p/${id.split("-")[0]}`}
                />
                {input?.prompt && (
                  <Action.CopyToClipboard icon={Icon.Text} title="Copy Prompt" content={input.prompt?.trim()} />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
};

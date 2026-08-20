import { useLayoutEffect, useState } from "react";
import { ActionPanel, Action, Grid, Icon, List, openCommandPreferences } from "@raycast/api";
import { Prediction, PredictionResponse } from "../types";
import { buildPredictionsList, copyImage, showAuthError, saveImage } from "../utils/helpers";
import { errorMessage, isAuthError, replicateFetch } from "../lib/replicate";
import { Single } from "./Single";

type Props = {
  onSearchTextChange?: (search: string) => void;
  isLoading?: boolean;
};
export const GridView = ({ isLoading, onSearchTextChange }: Props) => {
  const [predictions, setData] = useState<Prediction[]>();
  const [columns, setColumns] = useState("6");
  const [error, setError] = useState("");

  useLayoutEffect(() => {
    replicateFetch<PredictionResponse>("/predictions")
      .then((data) => setData(buildPredictionsList(data.results)))
      .catch((error) => {
        if (isAuthError(error)) showAuthError(undefined, errorMessage(error));
        setError(errorMessage(error));
      });
  }, []);

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: "⚠️" }}
          title="Error"
          description={error}
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
          description="Find models to run at replicate.com/explore"
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
      isLoading={!predictions || isLoading}
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

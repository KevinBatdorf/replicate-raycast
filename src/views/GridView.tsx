import { useLayoutEffect, useState } from "react";
import { ActionPanel, Action, Grid, getPreferenceValues } from "@raycast/api";
import { Prediction, PredictionResponse } from "../types";
import { PREDICTIONS_URL } from "../constants";
import { buildPredictionsList } from "../lib/helpers";
import { Single } from "./Single";
import fetch from "node-fetch";

type Props = {
  onSearchTextChange?: (search: string) => void;
  isLoading?: boolean;
};
export const GridView = ({ isLoading, onSearchTextChange }: Props) => {
  const [predictions, setData] = useState<Prediction[]>();
  const [itemSize, setItemSize] = useState<Grid.ItemSize>(Grid.ItemSize.Medium);
  const { token } = getPreferenceValues();
  const headers = { Authorization: `Token ${token}` };

  useLayoutEffect(() => {
    fetch(PREDICTIONS_URL, { headers })
      .then((res) => res.json())
      .then((res) => {
        const data = res as PredictionResponse;
        setData(buildPredictionsList(data.results));
      });
  });

  return (
    <Grid
      onSearchTextChange={onSearchTextChange}
      itemSize={itemSize}
      inset={undefined}
      enableFiltering={false}
      searchBarPlaceholder="Search your prompts"
      isLoading={!predictions || isLoading}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Grid Item Size"
          storeValue
          onChange={(newValue) => {
            setItemSize(newValue as Grid.ItemSize);
          }}
        >
          <Grid.Dropdown.Item title="Large" value={Grid.ItemSize.Large} />
          <Grid.Dropdown.Item title="Medium" value={Grid.ItemSize.Medium} />
          <Grid.Dropdown.Item title="Small" value={Grid.ItemSize.Small} />
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
                <Action.Push title="View" target={<Single prediction={prediction} />} />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
};

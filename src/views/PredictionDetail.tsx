import { ActionPanel, Color, Detail } from "@raycast/api";
import { Prediction, PredictionStatus } from "../types";
import { usePrediction } from "../hooks/usePrediction";
import { outputItems, outputMarkdown } from "../utils/output";
import { PredictionActions } from "./PredictionActions";

const STATUS_COLORS: Record<PredictionStatus, Color> = {
  starting: Color.Yellow,
  processing: Color.Blue,
  succeeded: Color.Green,
  failed: Color.Red,
  canceled: Color.SecondaryText,
};

type Props = {
  id: string;
  initial?: Prediction;
};
export const PredictionDetail = ({ id, initial }: Props) => {
  const { prediction, isLoading, revalidate } = usePrediction(id, initial);

  if (!prediction) {
    return <Detail isLoading={isLoading} markdown="" />;
  }

  const items = outputItems(prediction.output);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={prediction.model ?? "Prediction"}
      markdown={outputMarkdown(prediction, items)}
      metadata={
        <Detail.Metadata>
          {prediction.model && <Detail.Metadata.Label title="Model" text={prediction.model} />}
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={prediction.status} color={STATUS_COLORS[prediction.status]} />
          </Detail.Metadata.TagList>
          {prediction.metrics?.predict_time && (
            <Detail.Metadata.Label title="Ran for" text={`${prediction.metrics.predict_time.toFixed(1)}s`} />
          )}
          <Detail.Metadata.Link
            title="Prediction"
            text={prediction.id}
            target={`https://replicate.com/p/${prediction.id}`}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <PredictionActions prediction={prediction} items={items} revalidate={revalidate} />
        </ActionPanel>
      }
    />
  );
};

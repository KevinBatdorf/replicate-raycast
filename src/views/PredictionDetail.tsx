import { ActionPanel, Detail } from "@raycast/api";
import { Prediction } from "../types";
import { usePrediction } from "../hooks/usePrediction";
import { formatDate, formatDuration } from "../utils/format";
import { STATUS_COLORS } from "../utils/status";
import { outputItems, outputMarkdown } from "../utils/output";
import { PredictionActions } from "./PredictionActions";

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
          {formatDate(prediction.created_at) && (
            <Detail.Metadata.Label title="Created" text={formatDate(prediction.created_at)} />
          )}
          {formatDuration(prediction.metrics?.predict_time) && (
            <Detail.Metadata.Label title="Ran for" text={formatDuration(prediction.metrics?.predict_time)} />
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

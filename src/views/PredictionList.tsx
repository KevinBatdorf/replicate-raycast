import { Action, ActionPanel, Color, Icon, List, openCommandPreferences, showToast, Toast } from "@raycast/api";
import { Prediction, PredictionStatus } from "../types";
import { cancelPrediction, errorMessage } from "../lib/replicate";
import { copyImage, saveImage } from "../utils/helpers";
import { firstImage, outputItems, outputMarkdown } from "../utils/output";

const STATUS_COLORS: Record<PredictionStatus, Color> = {
  starting: Color.Yellow,
  processing: Color.Blue,
  succeeded: Color.Green,
  failed: Color.Red,
  canceled: Color.SecondaryText,
};

const formatDate = (value?: string) => (value ? new Date(value).toLocaleString() : undefined);

const duration = (prediction: Prediction) => {
  const seconds = prediction.metrics?.predict_time;
  return seconds ? `${seconds.toFixed(1)}s` : undefined;
};

type Props = {
  predictions?: Prediction[];
  isLoading: boolean;
  error?: Error;
  pagination?: List.Props["pagination"];
  revalidate: () => void;
};
export const PredictionList = ({ predictions, isLoading, error, pagination, revalidate }: Props) => {
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

  const cancel = async (prediction: Prediction) => {
    const toast = await showToast(Toast.Style.Animated, "Cancelling...");
    try {
      await cancelPrediction(prediction.id);
      toast.style = Toast.Style.Success;
      toast.title = "Prediction Cancelled";
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could Not Cancel the Prediction";
      toast.message = errorMessage(error);
    }
  };

  return (
    <List isShowingDetail isLoading={isLoading} pagination={pagination} searchBarPlaceholder="Search your prompts">
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
        const text = items.find((item) => item.kind === "text");
        const running = prediction.status === "starting" || prediction.status === "processing";

        return (
          <List.Item
            key={prediction.id}
            icon={{ source: image ?? Icon.Image, tintColor: image ? undefined : Color.SecondaryText }}
            title={prompt || prediction.model || prediction.id}
            keywords={[prediction.model ?? "", prediction.status]}
            accessories={[{ tag: { value: prediction.status, color: STATUS_COLORS[prediction.status] } }]}
            detail={
              <List.Item.Detail
                markdown={outputMarkdown(prediction, items)}
                metadata={
                  <List.Item.Detail.Metadata>
                    {prediction.model && <List.Item.Detail.Metadata.Label title="Model" text={prediction.model} />}
                    <List.Item.Detail.Metadata.TagList title="Status">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={prediction.status}
                        color={STATUS_COLORS[prediction.status]}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    {formatDate(prediction.created_at) && (
                      <List.Item.Detail.Metadata.Label title="Created" text={formatDate(prediction.created_at)} />
                    )}
                    {duration(prediction) && (
                      <List.Item.Detail.Metadata.Label title="Ran for" text={duration(prediction)} />
                    )}
                    <List.Item.Detail.Metadata.Link
                      title="Prediction"
                      text={prediction.id}
                      target={`https://replicate.com/p/${prediction.id}`}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                {image && <Action icon={Icon.SaveDocument} title="Save Image" onAction={() => saveImage(image)} />}
                {image && <Action icon={Icon.CopyClipboard} title="Copy Image" onAction={() => copyImage(image)} />}
                {text && <Action.CopyToClipboard icon={Icon.Text} title="Copy Output" content={text.text} />}
                <Action.OpenInBrowser
                  icon={Icon.Globe}
                  title="Open on Replicate"
                  url={`https://replicate.com/p/${prediction.id}`}
                />
                {prompt && <Action.CopyToClipboard icon={Icon.Text} title="Copy Prompt" content={prompt} />}
                {running && (
                  <Action
                    icon={Icon.Stop}
                    style={Action.Style.Destructive}
                    title="Cancel Prediction"
                    onAction={() => cancel(prediction)}
                  />
                )}
                <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={revalidate} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
};

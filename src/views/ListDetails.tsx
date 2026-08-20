import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Prediction } from "../types";
import { copyImage, saveImage } from "../utils/helpers";

type Props = {
  predictions: Prediction[];
  isLoading: boolean;
  search: string;
  setSearch: (search: string) => void;
  pagination?: List.Props["pagination"];
};
export const ListDetails = ({ predictions, isLoading, search, setSearch, pagination }: Props) => {
  const term = search.trim().toLowerCase();
  const matches = predictions.filter((prediction) => prediction.input?.prompt?.toLowerCase().includes(term));

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      searchText={search}
      onSearchTextChange={setSearch}
      pagination={pagination}
    >
      {matches.map((prediction) => {
        const { id, input, output } = prediction;
        const prompt = input?.prompt?.trim();
        const src = output[0];
        const markdown = `
### ${prompt ?? "No prompt provided"}

![${prompt ?? ""}](${src})`;
        return (
          <List.Item
            key={id}
            title={prompt ?? ""}
            detail={<List.Item.Detail markdown={markdown} />}
            actions={
              <ActionPanel>
                <Action icon={Icon.SaveDocument} title="Save Image" onAction={() => saveImage(src)} />
                <Action icon={Icon.CopyClipboard} title="Copy Image" onAction={() => copyImage(src)} />
                <Action.OpenInBrowser
                  icon={Icon.Globe}
                  title="Open on Replicate"
                  url={`https://replicate.com/p/${id.split("-")[0]}`}
                />
                {prompt && <Action.CopyToClipboard icon={Icon.Text} title="Copy Prompt" content={prompt} />}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
};

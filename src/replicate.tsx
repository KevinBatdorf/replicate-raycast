import { ActionPanel, Action, List, Icon } from "@raycast/api";
import RenderForm from "./components/Form";
import ViewPredictions from "./viewPredictions";

export default function Command() {
  return (
    <>
      <List>
        <List.Item
          icon={{ source: "replicate.png" }}
          title="Run a Model"
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" target={<RenderForm modelName={"stable-diffusion"} />} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: "replicate.png" }}
          title="View Predictions"
          actions={
            <ActionPanel>
              <Action.Push title="View Predictions" target={<ViewPredictions />} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: "replicate.png" }}
          title="Explore Models"
          accessories={[{ icon: Icon.ArrowNe }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Show Details" url="https://replicate.com/explore" />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: "replicate.png" }}
          title="Dashboard"
          accessories={[{ icon: Icon.ArrowNe }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url="https://replicate.com" />
            </ActionPanel>
          }
        />
        <List.Item
          icon={{ source: "replicate.png" }}
          title="Docs"
          accessories={[{ icon: Icon.ArrowNe }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url="https://replicate.com/docs" />
            </ActionPanel>
          }
        />
      </List>
    </>
  );
}

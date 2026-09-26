import { AI, getPreferenceValues } from "@raycast/api";
import { fullModel, recordUse, registeredModels } from "./lib/ai-models";
import { chatInput, chatReply, chatShape, streamOutput } from "./lib/chat";
import { createPrediction, waitForPrediction } from "./lib/replicate";
import { startTimer } from "./lib/timing";

const WAIT_SECONDS = 60;

export const getModels: AI.GetModels = () => registeredModels();

export const streamCompletion: AI.StreamCompletion = async function* (registered, request) {
  const timer = startTimer(`chat ${registered.id}`);
  const model = await fullModel(registered.id);
  timer.mark("model");
  const shape = chatShape(model);
  if (!shape) throw new Error(`${registered.id} returns output that a chat can't show.`);
  await recordUse(registered.id);

  const { input, prompt } = await chatInput(model, shape, request);
  timer.mark("input");
  const streams = shape.output === "text";
  const prediction = await createPrediction({
    owner: model.owner,
    name: model.name,
    version: model.latest_version?.id,
    official: model.is_official,
    input,
    // Sync mode would hold a text model's stream back until it finished.
    wait: streams ? undefined : WAIT_SECONDS,
  });

  timer.mark("created");

  if (streams && prediction.urls?.stream) {
    yield* streamOutput(prediction.urls.stream, getPreferenceValues<Preferences>().token);
    timer.mark("streamed");
    void timer.save(prediction);
    return;
  }

  const finished = await waitForPrediction(prediction);
  timer.mark("finished");
  void timer.save(finished);
  if (finished.status !== "succeeded") throw new Error(finished.error ?? `The prediction ${finished.status}.`);
  yield chatReply(finished, prompt, shape);
};

import { AI, getPreferenceValues } from "@raycast/api";
import { chatDefaults, fullModel, recordUse, registeredModels } from "./lib/ai-models";
import { chatInput, chatReply, chatShape, streamOutput } from "./lib/chat";
import { saveOutputs } from "./lib/history";
import { createPrediction, followPrediction, stillRunning } from "./lib/replicate";
import { Prediction } from "./types";
import { isRunning, logPercent } from "./utils/status";

const STATUS = "status";
const ANSWER = "answer";
const CHAT_POLL_MS = 1000;

const status = (text: string): AI.ModelStreamPart => ({ type: "reasoning-delta", id: STATUS, text: `${text}\n` });
const answer = (text: string): AI.ModelStreamPart => ({ type: "text-delta", id: ANSWER, text });

const progress = (prediction: Prediction) => {
  if (prediction.status === "starting") return "Waiting for Replicate to start the model…";
  if (prediction.status !== "processing") return undefined;
  const percent = logPercent(prediction.logs);
  return percent ? `Generating… ${percent}%` : "Generating…";
};

export const getModels: AI.GetModels = () => registeredModels();

// Status goes out as reasoning so a slow run shows movement without ending up in the answer.
export const streamCompletion: AI.StreamCompletion = async function* (registered, request) {
  yield { type: "reasoning-start", id: STATUS };
  yield status(`Starting ${registered.id} on Replicate…`);

  const model = await fullModel(registered.id);
  const shape = chatShape(model);
  if (!shape) throw new Error(`${registered.id} returns output that a chat can't show.`);
  await recordUse(registered.id);

  const { input, prompt } = await chatInput(model, shape, request);
  const created = await createPrediction({
    owner: model.owner,
    name: model.name,
    version: model.latest_version?.id,
    official: model.is_official,
    input: { ...(await chatDefaults(registered.id)), ...input },
  });

  if (shape.output === "text" && created.urls?.stream) {
    yield { type: "reasoning-end", id: STATUS };
    yield { type: "text-start", id: ANSWER };
    for await (const token of streamOutput(created.urls.stream, getPreferenceValues<Preferences>().token)) {
      yield answer(token);
    }
    yield { type: "text-end", id: ANSWER };
    yield { type: "finish", finishReason: "stop" };
    return;
  }

  let finished = created;
  let shown: string | undefined;
  for await (const prediction of followPrediction(created, { interval: CHAT_POLL_MS })) {
    finished = prediction;
    const line = progress(prediction);
    if (line && line !== shown) yield status(line);
    shown = line ?? shown;
  }
  if (isRunning(finished)) throw stillRunning(finished);
  if (finished.status !== "succeeded") throw new Error(finished.error ?? `The prediction ${finished.status}.`);

  const seconds = finished.metrics?.predict_time;
  yield status(seconds ? `Done in ${seconds.toFixed(1)}s.` : "Done.");
  yield { type: "reasoning-end", id: STATUS };
  yield { type: "text-start", id: ANSWER };
  yield answer(chatReply(finished, prompt, shape));
  yield { type: "text-end", id: ANSWER };
  await saveOutputs(finished);
  yield { type: "finish", finishReason: "stop" };
};

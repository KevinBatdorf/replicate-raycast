import { AI, getPreferenceValues, LocalStorage } from "@raycast/api";
import { Model } from "../types";
import { DAY_MS, cached } from "./cache";
import { chatCapabilities, chatShape } from "./chat";
import { collectionModels, getModel, modelId } from "./replicate";

const ADDED_KEY = "ai-models-added";
const HIDDEN_KEY = "ai-models-hidden";
const POPULAR_COLLECTIONS = ["text-to-image", "image-editing"];
const POPULAR_PER_COLLECTION = 5;
const ICON = "replicate.png";

const readIds = async (key: string) => {
  try {
    const stored = await LocalStorage.getItem<string>(key);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    // Unreadable storage should cost the user's picks, not the whole model list.
    return [];
  }
};

const writeIds = (key: string, ids: string[]) => LocalStorage.setItem(key, JSON.stringify([...new Set(ids)]));

export const addedModelIds = () => readIds(ADDED_KEY);

export const hiddenModelIds = () => readIds(HIDDEN_KEY);

export const fullModel = (id: string) => {
  const [owner, name] = id.split("/");
  return cached(`model:${id}`, DAY_MS, () => getModel(owner, name));
};

// Run counts are all-time, so official models go first to keep 2023 Stable Diffusion off the top.
const pickPopular = (models: Model[]) => {
  const usable = models.filter((model) => !model.latest_version || chatShape(model));
  return [...usable.filter((model) => model.is_official), ...usable.filter((model) => !model.is_official)].slice(
    0,
    POPULAR_PER_COLLECTION,
  );
};

export const popularModelIds = () =>
  cached("ai-models:popular", DAY_MS, async () => {
    const lists = await Promise.all(POPULAR_COLLECTIONS.map(collectionModels));
    return [...new Set(lists.flatMap((models) => pickPopular(models).map(modelId)))];
  });

const register = (model: Model): AI.RegisteredModel | undefined => {
  const shape = chatShape(model);
  if (!shape) return undefined;
  const id = modelId(model);
  return {
    id,
    title: model.name,
    description: model.description ? `${id} — ${model.description}` : id,
    icon: ICON,
    capabilities: chatCapabilities(shape),
  };
};

const registerById = (id: string) =>
  fullModel(id)
    .then(register)
    .catch(() => undefined);

export const registeredModels = async () => {
  const { popularModels } = getPreferenceValues<Preferences>();
  const [added, hidden, popular] = await Promise.all([
    addedModelIds(),
    hiddenModelIds(),
    popularModels ? popularModelIds().catch((): string[] => []) : [],
  ]);

  // Dropping a model the user added or chatted with would break those chats.
  const yours = await Promise.all(
    added.map(async (id) => (await registerById(id)) ?? { id, title: id.split("/")[1] ?? id, icon: ICON }),
  );
  const others = await Promise.all(
    popular.filter((id) => !hidden.includes(id) && !added.includes(id)).map(registerById),
  );
  return [...yours, ...others.filter((model): model is AI.RegisteredModel => Boolean(model))];
};

export const addModel = async (id: string) => writeIds(ADDED_KEY, [...(await addedModelIds()), id]);

export const recordUse = async (id: string) => {
  const added = await addedModelIds();
  if (!added.includes(id)) await writeIds(ADDED_KEY, [...added, id]);
};

export const hideModel = async (id: string) => writeIds(HIDDEN_KEY, [...(await hiddenModelIds()), id]);

export const unhideModel = async (id: string) =>
  writeIds(
    HIDDEN_KEY,
    (await hiddenModelIds()).filter((entry) => entry !== id),
  );

export const removeModel = async (id: string) => {
  await writeIds(
    ADDED_KEY,
    (await addedModelIds()).filter((entry) => entry !== id),
  );
  // Without the hide, a popular model the user removed returns on the next daily refresh.
  const popular = await popularModelIds().catch((): string[] => []);
  if (popular.includes(id)) await hideModel(id);
};

export const refreshAIModels = async () => {
  try {
    await AI.refreshModels();
  } catch {
    // The stored change stands either way; Raycast also re-reads models on its own schedule.
  }
};

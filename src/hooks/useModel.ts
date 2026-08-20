import { useCachedPromise } from "@raycast/utils";
import { getModel } from "../lib/replicate";

export const useModel = (id?: string) => {
  const [owner, name] = (id ?? "").split("/");
  // Holding the previous model's schema would leave its fields on screen for a different model.
  return useCachedPromise((modelOwner: string, modelName: string) => getModel(modelOwner, modelName), [owner, name], {
    execute: Boolean(owner && name),
  });
};

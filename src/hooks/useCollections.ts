import { useCachedPromise } from "@raycast/utils";
import { listCollections } from "../lib/replicate";

export const useCollections = () => useCachedPromise(listCollections, [], { initialData: [] });

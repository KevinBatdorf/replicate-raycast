import { useCachedPromise } from "@raycast/utils";
import { listModels, searchModels } from "../lib/replicate";

export const useModels = (query: string) =>
  useCachedPromise((search: string) => (search.trim() ? searchModels(search.trim()) : listModels()), [query], {
    keepPreviousData: true,
    initialData: [],
  });

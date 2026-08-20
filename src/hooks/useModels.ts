import { useCachedPromise } from "@raycast/utils";
import { collectionModels, listModels, searchModels } from "../lib/replicate";

export const useModels = (query: string, collection?: string) =>
  useCachedPromise(
    (search: string, slug?: string) => {
      if (search.trim()) return searchModels(search.trim());
      if (slug) return collectionModels(slug);
      return listModels();
    },
    [query, collection],
    { keepPreviousData: true, initialData: [] },
  );

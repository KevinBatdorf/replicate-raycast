import { usePromise } from "@raycast/utils";
import { PredictionResponse } from "../types";
import { replicateFetch } from "../lib/replicate";
import { buildPredictionsList } from "../utils/helpers";

export const usePredictions = () =>
  usePromise(
    () =>
      async ({ cursor }: { cursor?: string }) => {
        const response = await replicateFetch<PredictionResponse>(cursor ?? "/predictions");
        return {
          data: buildPredictionsList(response.results) ?? [],
          hasMore: Boolean(response.next),
          cursor: response.next ?? undefined,
        };
      },
    [],
  );

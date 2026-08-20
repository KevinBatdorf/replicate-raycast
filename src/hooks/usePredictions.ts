import { useEffect } from "react";
import { usePromise } from "@raycast/utils";
import { PredictionResponse } from "../types";
import { replicateFetch } from "../lib/replicate";
import { isRunning } from "../utils/status";

const POLL_INTERVAL_MS = 2500;

export const usePredictions = () => {
  const result = usePromise(
    () =>
      async ({ cursor }: { cursor?: string }) => {
        const response = await replicateFetch<PredictionResponse>(cursor ?? "/predictions");
        return {
          data: response.results,
          hasMore: Boolean(response.next),
          cursor: response.next ?? undefined,
        };
      },
    [],
  );

  const { data, isLoading, revalidate } = result;
  const waiting = data?.some(isRunning) ?? false;

  useEffect(() => {
    if (!waiting || isLoading) return;
    const timer = setTimeout(revalidate, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [waiting, isLoading, revalidate]);

  return result;
};

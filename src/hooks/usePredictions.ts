import { useEffect, useRef, useState } from "react";
import { usePromise } from "@raycast/utils";
import { Prediction, PredictionResponse } from "../types";
import { getPrediction, replicateFetch } from "../lib/replicate";
import { POLL_INTERVAL_MS, isRunning } from "../utils/status";

const MAX_POLLED = 5;

export const usePredictions = () => {
  const seen = useRef(new Set<string>());
  const result = usePromise(
    () =>
      async ({ cursor }: { cursor?: string }) => {
        if (!cursor) seen.current = new Set();
        const response = await replicateFetch<PredictionResponse>(cursor ?? "/predictions");
        // Later pages can return predictions an earlier page already listed.
        const fresh = response.results.filter((prediction) => !seen.current.has(prediction.id));
        return {
          data: fresh,
          hasMore: Boolean(response.next) && fresh.length > 0,
          cursor: response.next ?? undefined,
        };
      },
    [],
    {
      // Only pages that land count as seen; a load Raycast discards must not hide its page.
      onData: (page: Prediction[]) => {
        for (const prediction of page) seen.current.add(prediction.id);
      },
    },
  );

  // Kept apart from the paged data: mutating it cancels whichever page is still loading.
  const [live, setLive] = useState<Record<string, Prediction>>({});
  const predictions = (result.data ?? []).map((prediction) => live[prediction.id] ?? prediction);
  const ids = predictions
    .filter(isRunning)
    .slice(0, MAX_POLLED)
    .map((prediction) => prediction.id)
    .join(",");

  useEffect(() => {
    if (!ids) return;
    const timer = setTimeout(async () => {
      try {
        const updated = await Promise.all(ids.split(",").map(getPrediction));
        setLive((current) => ({ ...current, ...Object.fromEntries(updated.map((p) => [p.id, p])) }));
      } catch {
        // A failed poll leaves the last known status; the next one tries again.
        setLive((current) => ({ ...current }));
      }
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [ids, live]);

  const revalidate = () => {
    setLive({});
    return result.revalidate();
  };

  return { ...result, data: result.data ? predictions : undefined, revalidate };
};

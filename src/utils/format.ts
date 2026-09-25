export const formatRuns = (count?: number) => {
  if (!count) return undefined;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M runs`;
  if (count >= 1_000) return `${Math.round(count / 1_000)}K runs`;
  return `${count} runs`;
};

export const formatDate = (value?: string) => (value ? new Date(value).toLocaleString() : undefined);

export const formatDuration = (seconds?: number) => (seconds ? `${seconds.toFixed(1)}s` : undefined);

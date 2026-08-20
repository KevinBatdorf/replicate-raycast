export const formatRuns = (count?: number) => {
  if (!count) return undefined;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M runs`;
  if (count >= 1_000) return `${Math.round(count / 1_000)}K runs`;
  return `${count} runs`;
};

import { useState } from "react";
import { usePredictions } from "./hooks/usePredictions";
import { GridView } from "./views/GridView";
import { ListDetails } from "./views/ListDetails";

export default function ViewPredictions() {
  const [search, setSearch] = useState("");
  const { data: predictions, isLoading, error, pagination } = usePredictions();

  if (search) {
    return (
      <ListDetails
        predictions={predictions ?? []}
        isLoading={isLoading}
        search={search}
        setSearch={setSearch}
        pagination={pagination}
      />
    );
  }
  return (
    <GridView
      predictions={predictions}
      isLoading={isLoading}
      error={error}
      pagination={pagination}
      onSearchTextChange={setSearch}
    />
  );
}

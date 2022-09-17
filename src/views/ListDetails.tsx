import { List } from "@raycast/api";
import { useSQL } from "@raycast/utils";
import { useEffect } from "react";
import { DB_FILE_PATH } from "../constants";
import { useDatabase } from "../hooks/useDatabase";
import { dbEntry } from "../types";

type Props = {
  search: string;
  isLoading: boolean;
  setSearch: (search: string) => void;
};
export const ListDetails = ({ isLoading, search, setSearch }: Props) => {
  const { data: results, isLoading: searching } = useSQL(
    DB_FILE_PATH,
    `SELECT * FROM Prediction WHERE prompt LIKE '%${search}%'`
  );
  return (
    <List isShowingDetail isLoading={isLoading || searching} searchText={search} onSearchTextChange={setSearch}>
      {results?.map((result) => {
        const { id, prompt, src } = result as dbEntry;
        const markdown = `
### ${prompt?.trim() ?? "No prompt provided"}

![${prompt?.trim() ?? ""}](${src})`;
        return <List.Item key={id} title={prompt?.trim() ?? ""} detail={<List.Item.Detail markdown={markdown} />} />;
      })}
    </List>
  );
};

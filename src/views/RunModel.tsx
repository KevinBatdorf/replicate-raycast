import { useEffect, useState } from "react";
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { createPrediction, errorMessage, isAuthError, uploadFile } from "../lib/replicate";
import { showAuthError } from "../utils/helpers";
import { Field, modelFields } from "../utils/schema";
import { useModel } from "../hooks/useModel";
import { useModels } from "../hooks/useModels";
import { ModelField } from "./ModelField";
import { PredictionDetail } from "./PredictionDetail";

type FormValues = Record<string, string | string[] | boolean>;

const asNumber = (value: string, field: Field) =>
  field.schema.type === "integer" ? Number.parseInt(value, 10) : Number.parseFloat(value);

const buildInput = async (fields: Field[], values: FormValues) => {
  const input: Record<string, unknown> = {};

  for (const field of fields) {
    const value = values[field.name];

    if (field.kind === "file") {
      const [path] = Array.isArray(value) ? value : [];
      const url = String(values[`${field.name}__url`] ?? "").trim();
      if (path) input[field.name] = await uploadFile(path);
      else if (url) input[field.name] = url;
      continue;
    }
    if (field.kind === "boolean") {
      input[field.name] = Boolean(value);
      continue;
    }

    const text = String(value ?? "").trim();
    if (!text) continue;
    input[field.name] = field.kind === "number" ? asNumber(text, field) : text;
  }

  return input;
};

export const RunModel = () => {
  const { push } = useNavigation();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: models, isLoading: loadingModels } = useModels(query);
  const { data: model, isLoading: loadingModel } = useModel(selected);
  const {
    value: lastModel,
    setValue: setLastModel,
    isLoading: loadingLastModel,
  } = useLocalStorage<string>("last-model");
  const { value: lastInputs, setValue: setLastInputs } = useLocalStorage<Record<string, Record<string, string>>>(
    "last-inputs",
    {},
  );

  useEffect(() => {
    if (selected || loadingLastModel) return;
    setSelected(lastModel ?? (models?.length ? `${models[0].owner}/${models[0].name}` : undefined));
  }, [selected, loadingLastModel, lastModel, models]);

  const fields = modelFields(model);
  const options = models ?? [];
  const missingSelected = selected && !options.some((option) => `${option.owner}/${option.name}` === selected);

  const handleSubmit = async (values: FormValues) => {
    if (!model || !selected) return;

    const missing = fields.filter(
      (field) => field.required && field.kind !== "boolean" && !String(values[field.name] ?? "").trim(),
    );
    if (missing.length) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing Required Input",
        message: missing.map((field) => field.title).join(", "),
      });
      return;
    }

    setIsSubmitting(true);
    const toast = await showToast(Toast.Style.Animated, "Starting the prediction...");
    try {
      const input = await buildInput(fields, values);
      const prediction = await createPrediction({
        owner: model.owner,
        name: model.name,
        version: model.latest_version?.id,
        input,
      });

      const remembered = Object.fromEntries(
        Object.entries(input).map(([key, value]) => [key, typeof value === "string" ? value : String(value)]),
      );
      await setLastModel(selected);
      await setLastInputs({ ...(lastInputs ?? {}), [selected]: remembered });

      toast.hide();
      push(<PredictionDetail id={prediction.id} initial={prediction} />);
    } catch (error) {
      toast.hide();
      if (isAuthError(error)) {
        await showAuthError(undefined, errorMessage(error));
        return;
      }
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Run the Model",
        message: errorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={loadingModels || loadingModel || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Play} title="Run Model" onSubmit={handleSubmit} />
          {selected && (
            <Action.OpenInBrowser
              icon={Icon.Globe}
              title="Open Model on Replicate"
              url={`https://replicate.com/${selected}`}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="model"
        title="Model"
        value={selected}
        onChange={setSelected}
        onSearchTextChange={setQuery}
        throttle
        isLoading={loadingModels}
      >
        {missingSelected && <Form.Dropdown.Item key={selected} value={selected} title={selected} />}
        {options.map((option) => {
          const id = `${option.owner}/${option.name}`;
          return <Form.Dropdown.Item key={id} value={id} title={id} icon={option.cover_image_url ?? Icon.Box} />;
        })}
      </Form.Dropdown>
      <Form.Separator />
      {fields.map((field) => (
        <ModelField
          key={`${selected}-${field.name}`}
          field={field}
          defaultValue={selected ? lastInputs?.[selected]?.[field.name] : undefined}
        />
      ))}
      {!fields.length && !loadingModel && (
        <Form.Description text={model ? "This model exposes no inputs." : "Pick a model to see its inputs."} />
      )}
    </Form>
  );
};

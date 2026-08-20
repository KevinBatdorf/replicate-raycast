import { useEffect, useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { models, Model, OptionSchema } from "../models";
import crypto from "crypto";
import { showAuthError } from "../utils/helpers";
import { errorMessage, isAuthError, replicateFetch } from "../lib/replicate";
import { Prediction } from "../types";
import { PredictionDetail } from "../views/PredictionDetail";

type FormValue = string | number | boolean | Date | string[];
type FormValues = Record<string, FormValue>;

type Option = {
  name: string;
  values: OptionSchema;
  enums: string[];
};

interface ModelResult {
  models: Model[];
}

const generateId = (name: string) => `${crypto.randomUUID()}-${name}`;

export default function RenderForm(props: { modelName: string }) {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<Option[]>([]);
  const [modelName, setModelName] = useState(props.modelName);
  const [modelOptions, setModelOptions] = useState<Model[]>(models);

  async function handler(values: FormValues) {
    const model = (await getModelByName(modelName)) as Model;

    let filteredValues: FormValues = Object.fromEntries(Object.entries(values).filter(([, v]) => v));
    filteredValues = Object.fromEntries(
      Object.entries(filteredValues).map(([k, v]) => [k.replace(model.name, "").replace("-", ""), v]),
    );

    // Form fields hand back strings; Replicate 422s when a number arrives quoted.
    for (const entry of Object.entries(filteredValues)) {
      const option = options.filter((option) => option.name === entry[0])[0];

      if (option && option.values && (option.values.type === "number" || option.values.type === "integer")) {
        if (option.values.type === "integer") {
          filteredValues[entry[0]] = parseInt(entry[1] as string);
        }

        if (option.values.type === "number") {
          filteredValues[entry[0]] = parseFloat(entry[1] as string);
        }
      }
    }

    return await replicateFetch<Prediction>("/predictions", {
      method: "POST",
      body: JSON.stringify({
        version: model?.latest_version?.id,
        input: filteredValues,
      }),
    });
  }

  async function getModelByName(name: string) {
    const model = modelOptions.filter((model) => model.name === name);
    return getModel(model[0].owner, model[0].name);
  }

  async function getModel(owner: string, name: string) {
    return await replicateFetch<Model>(`/models/${owner}/${name}`);
  }

  async function getModelsByCollection(collection: string) {
    const result = await replicateFetch<ModelResult>(`/collections/${collection}`);

    result.models.map((model: Model) => {
      model.id = generateId(model.name);
    });

    return JSON.stringify(result.models as Model[]);
  }

  const parseModelInputs = (model: Model): Option[] => {
    const schemas = model.latest_version?.openapi_schema.components.schemas ?? {};
    const properties = schemas.Input?.properties ?? {};

    return Object.entries(properties).map(([name, values]) => ({
      name,
      values,
      // An allOf input keeps its enum in a sibling schema of the same name.
      enums: values.allOf ? (schemas[name]?.enum ?? []) : [],
    }));
  };

  const handleSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const prediction = await handler(values);
      push(<PredictionDetail id={prediction.id} initial={prediction} />);
    } catch (error) {
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
      setIsLoading(false);
    }
  };

  function updateForm(modelName: string) {
    getModelByName(modelName).then((model) => {
      const options = parseModelInputs(model);
      setOptions(options.sort((a, b) => (a.values["x-order"] ?? 0) - (b.values["x-order"] ?? 0)));
      setModelName(modelName);
    });
  }

  useEffect(() => {
    updateForm(props.modelName);
    getModelsByCollection("text-to-image")
      .then((models) => setModelOptions(JSON.parse(models)))
      // A retired or renamed collection leaves the built-in model list in place.
      .catch(() => undefined);
  }, []);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="dropdown" title="Model" defaultValue={props.modelName} onChange={(e) => updateForm(e)}>
        {modelOptions.map((model) => (
          <Form.Dropdown.Item key={model.id} value={model.name} title={model.name} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      {options.map((option) => (
        <RenderFormInput key={`${modelName}-${option.name}`} option={option} modelName={modelName} />
      ))}
    </Form>
  );
}

function RenderFormInput(props: { option: Option; modelName: string }) {
  function toString(value: string | number | boolean | undefined) {
    if (value == null) {
      return "";
    } else {
      return value.toString();
    }
  }

  const optionValues = props.option.values;
  const optionDefault = props.option.values?.default;
  const optionDescription = props.option.values?.description;

  // Note, the ID is used to get the value of input field. Don't change the IDs!
  return optionValues?.allOf ? (
    <>
      <Form.Description
        key={`description-${props.option.name}-${props.modelName}`}
        text={props.option.name || "Undefined"}
      />
      <Form.Dropdown id={`${props.modelName}-${props.option.name}`} defaultValue={toString(optionDefault)}>
        {props.option.enums.map((value: string | number, i: number) => (
          <Form.Dropdown.Item key={`${props.option.name}-${i}`} value={toString(value)} title={toString(value)} />
        ))}
      </Form.Dropdown>
    </>
  ) : (
    <>
      <Form.Description key={`description-${props.option.name}`} text={props.option.name || "Undefined"} />
      <Form.TextField
        id={`${props.modelName}-${props.option.name}`}
        defaultValue={toString(optionDefault)}
        info={optionDescription}
      />
    </>
  );
}

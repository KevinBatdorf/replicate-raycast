import { Clipboard, environment, openCommandPreferences, showHUD, showToast, Toast } from "@raycast/api";
import { homedir } from "node:os";
import { extname, join } from "node:path";
import isImage from "is-image";
import { Prediction } from "../types";
import { downloadFile, errorMessage } from "../lib/replicate";

export const buildPredictionsList = (data?: Prediction[]) => {
  if (!data) return undefined;
  if (!data.length) return [];
  const predictions: Prediction[] = [];
  data
    ?.filter(succeeded)
    ?.filter(isUrl)
    ?.filter(isAnImage)
    ?.forEach((prediction) => {
      if (!Array.isArray(prediction.output)) {
        predictions.push({
          ...prediction,
          output: [prediction.output],
          id: `${prediction.id}`,
        });
        return;
      }
      prediction?.output?.forEach((url, index) => {
        predictions.push({
          ...prediction,
          output: [url],
          id: `${prediction.id}-${index}`,
        });
      });
    });
  return predictions;
};

export const succeeded = (prediction: Prediction) => prediction.status === "succeeded";

// is-image reads everything past the last dot, so a signed URL's query breaks it.
const looksLikeImage = (url: string) => {
  try {
    return isImage(new URL(url).pathname);
  } catch {
    return false;
  }
};

export const isAnImage = ({ output }: Prediction) =>
  typeof output === "string" ? looksLikeImage(output) : (output?.every(looksLikeImage) ?? false);
export const isUrl = (prediction: Prediction) => {
  try {
    if (!Array.isArray(prediction.output)) {
      new URL(prediction.output);
      return true;
    }
    prediction?.output.forEach((url) => new URL(url));
    return true;
  } catch {
    return false;
  }
};
export const makeTitle = (str: string) =>
  str.replace(/_/g, " ").replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());

const outputFileName = (url: string) => {
  const segments = new URL(url).pathname.split("/").filter(Boolean);
  const name = segments.at(-2) ?? "replicate";
  return `${name}${extname(segments.at(-1) ?? "") || ".png"}`;
};

export const copyImage = async (url: string) => {
  const toast = await showToast(Toast.Style.Animated, "Copying image...");
  try {
    const file = await downloadFile(url, join(environment.supportPath, outputFileName(url)));
    await Clipboard.copy({ file });
    toast.hide();
    await showHUD("✅ Image copied to clipboard!");
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not Copy the Image";
    toast.message = errorMessage(error);
  }
};

export const saveImage = async (url: string) => {
  const destination = join(homedir(), "Downloads", outputFileName(url));
  const toast = await showToast(Toast.Style.Animated, "Saving image...");
  try {
    await downloadFile(url, destination);
    toast.hide();
    await showHUD(`✅ Image saved to ${destination}`);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not Save the Image";
    toast.message = errorMessage(error);
  }
};

export const showAuthError = (title?: string, message?: string) =>
  showToast({
    title: title ?? "Replicate Rejected the Request",
    message,
    style: Toast.Style.Failure,
    primaryAction: {
      title: "Update Token",
      onAction: openCommandPreferences,
    },
  });

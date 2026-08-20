import { Clipboard, environment, openCommandPreferences, showHUD, showToast, Toast } from "@raycast/api";
import { homedir } from "node:os";
import { extname, join } from "node:path";
import { downloadFile, errorMessage } from "../lib/replicate";

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

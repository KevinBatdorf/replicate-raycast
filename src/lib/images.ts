import { environment, getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { promisify } from "node:util";
import { altText } from "../utils/output";
import { downloadFile } from "./replicate";

const run = promisify(execFile);

const PREVIEW_QUALITY = 60;

// AI Chat ignores size hints and won't load local files, so a shrunk copy is embedded.
export const chatImage = async (url: string, { name, prompt }: { name: string; prompt: string }) => {
  const alt = altText(prompt);
  const { chatImageSize } = getPreferenceValues<Preferences>();
  if (chatImageSize === "full") return `![${alt}](${url})`;

  try {
    const directory = join(environment.supportPath, "generations");
    await mkdir(directory, { recursive: true });
    const file = await downloadFile(url, join(directory, `${name}${extname(new URL(url).pathname)}`));
    const preview = join(directory, `${name}-preview.jpg`);
    await run("sips", [
      ...["-Z", chatImageSize, "-s", "format", "jpeg", "-s", "formatOptions", String(PREVIEW_QUALITY)],
      ...[file, "--out", preview],
    ]);
    const data = (await readFile(preview)).toString("base64");
    return `[![${alt}](data:image/jpeg;base64,${data})](${url})`;
  } catch {
    // sips only exists on macOS, and a failed copy shouldn't cost the user the image.
    return `![${alt}](${url})`;
  }
};

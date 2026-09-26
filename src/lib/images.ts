import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { altText } from "../utils/output";
import { downloadFile } from "./replicate";

const run = promisify(execFile);

// AI Chat ignores raycast-width and HTML sizing, so the preview itself is resized.
const PREVIEW_SIZE = 400;

export const chatImage = async (url: string, { name, prompt }: { name: string; prompt: string }) => {
  const alt = altText(prompt);
  try {
    const directory = join(environment.supportPath, "generations");
    await mkdir(directory, { recursive: true });
    const file = await downloadFile(url, join(directory, `${name}${extname(new URL(url).pathname)}`));
    const preview = join(directory, `${name}-preview.jpg`);
    await run("sips", ["-Z", String(PREVIEW_SIZE), "-s", "format", "jpeg", file, "--out", preview]);
    return `[![${alt}](${pathToFileURL(preview).href})](${url})`;
  } catch {
    // sips only exists on macOS, and a failed copy shouldn't cost the user the image.
    return `![${alt}](${url})`;
  }
};

import "server-only";
import { getAISetting } from "./ai-settings-server";
import { recognizeBailian } from "./bailian-server";
import { chat } from "./server";
import { recognizePrinted } from "./tencent-server";
import { buildMaterial, type ContentMode } from "./materials";
export type VisionProvider = "tencent" | "bailian" | "openai-compatible";
const legacy = ["xfyun", "default", ""];
export function visionProvider(value?: string): VisionProvider {
  if (value === "tencent") return "tencent";
  if (value === "bailian") return "bailian";
  return "openai-compatible";
}
export async function readMaterial(
  image: string,
  source: string,
  mode: ContentMode,
  signal: AbortSignal,
  provider?: string,
) {
  const chosen = visionProvider(
    provider && !legacy.includes(provider)
      ? provider
      : getAISetting("VISION_PROVIDER"),
  );
  if (chosen === "tencent")
    return buildMaterial({
      source,
      provider: "tencent-layout",
      blocks: await recognizePrinted(image, signal),
      mode,
    });
  const text =
    chosen === "bailian"
      ? await recognizeBailian(image, mode, signal)
      : await chat(
          "VISION",
          [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "请提取图片中的所有文字。仅输出识别到的纯文本内容，按原始段落与换行顺序排列，不要添加任何解释或 Markdown 格式。",
                },
                { type: "image_url", image_url: { url: image } },
              ],
            },
          ],
          false,
          signal,
        );
  return buildMaterial({
    source,
    provider: chosen === "bailian" ? "bailian-text" : "xfyun-text",
    text,
    blocks: text
      .split("\n")
      .map((text, i) => ({ id: `line-${i + 1}`, text }))
      .filter((v) => v.text.trim()),
    mode,
  });
}

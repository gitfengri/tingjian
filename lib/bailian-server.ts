import "server-only";
import { ffmpegAudio } from "./audio-server";
import type { RecognizedLine } from "./handwriting";
import type { ContentMode } from "./materials";
import { recordService } from "./service-health";
import { config, ServiceError } from "./server";

/**
 * Alibaba Cloud Model Studio (百炼 / DashScope) adapters.
 *
 * Chat, vision and ASR all share the OpenAI-compatible endpoint. Vision uses
 * image_url content parts, ASR uses the Qwen-ASR input_audio part documented at
 * https://help.aliyun.com/zh/document_detail/2986952.html
 */

const MAX_ASR_BYTES = 10 * 1024 * 1024;

function bailianErrorText(status: number, body: string) {
  let code = "";
  let message = "";
  try {
    const parsed = JSON.parse(body) as {
      code?: unknown;
      message?: unknown;
      error?: { code?: unknown; message?: unknown };
    };
    code =
      typeof parsed.error?.code === "string"
        ? parsed.error.code
        : typeof parsed.code === "string"
          ? parsed.code
          : "";
    message =
      typeof parsed.error?.message === "string"
        ? parsed.error.message
        : typeof parsed.message === "string"
          ? parsed.message
          : "";
  } catch {
    /* Non-JSON provider response keeps the generic label. */
  }
  const detail = [code, message].filter(Boolean).join("：").slice(0, 160);
  if (status === 401 || status === 403)
    return `百炼鉴权失败，请检查 API Key 与模型开通状态${detail ? `（${detail}）` : ""}`;
  if (status === 429 || /Throttling|AllocationQuota|Arrearage/i.test(code))
    return "百炼请求过于频繁或额度不足，请稍后重试";
  if (/ModelNotExist|InvalidParameter|Unsupported|AccessDenied/i.test(code))
    return `百炼拒绝了请求，请检查模型名称与权限${detail ? `（${detail}）` : ""}`;
  return `百炼调用失败，请稍后重试${detail ? `（${detail}）` : ""}`;
}

async function postJSON(
  url: string,
  key: string,
  body: unknown,
  signal: AbortSignal,
  timeout = 60000,
) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.any([AbortSignal.timeout(timeout), signal]),
    });
    const text = await response.text();
    if (!response.ok)
      throw new ServiceError(
        response.status === 429 ? 429 : 502,
        bailianErrorText(response.status, text),
      );
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new ServiceError(502, "百炼返回了无法解析的结果");
    }
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    if (signal.aborted) throw new ServiceError(499, "请求已取消");
    throw new ServiceError(503, "百炼服务未连接或请求超时，请检查网络后重试");
  }
}

function visionPrompt(mode: ContentMode) {
  const base =
    "请识别这张图片中的全部文字，只输出纯文本，不要解释、不要添加 Markdown 标记。";
  if (mode === "words")
    return `${base}按图片从左到右、从上到下的顺序，每行只输出一个词语，保留原文用字与标点；英文按单词逐行输出，括号或逗号里的多个词形分别输出。`;
  if (mode === "sentences")
    return `${base}按原文顺序输出，每行只输出一句话。`;
  if (mode === "phrases")
    return `${base}按原文顺序输出，每行只输出一个短语，不要把相邻的词合并成一句。`;
  return `${base}若内容是词语表或表格，每行只输出一个词语；若内容是文章或句子，按自然段与换行原样输出。`;
}

/** Shared vision call: image in, plain text out, per-service config. */
async function visionText(
  prefix: "VISION" | "HANDWRITING",
  image: string,
  prompt: string,
  signal: AbortSignal,
  label: string,
) {
  const c = config(prefix);
  const data = await postJSON(
    `${c.base}/chat/completions`,
    c.key,
    {
      model: c.model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: image } },
          ],
        },
      ],
      stream: false,
    },
    signal,
  );
  const choice = (data.choices as
    | {
        message?: { content?: unknown };
        finish_reason?: string;
      }[]
    | undefined)?.[0];
  if (choice?.finish_reason === "length")
    throw new ServiceError(502, "百炼未返回完整识别结果，请重试");
  const content = choice?.message?.content;
  const text =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content
            .map((part) =>
              part && typeof part === "object" && "text" in part
                ? String(part.text)
                : "",
            )
            .join("")
        : "";
  if (!text.trim())
    throw new ServiceError(502, "百炼没有识别到文字，请调整选区或重新拍摄");
  recordService(prefix, true, label);
  return text.trim();
}

/** Printed-word recognition through the Bailian vision model. */
export async function recognizeBailian(
  image: string,
  mode: ContentMode,
  signal: AbortSignal,
) {
  return visionText(
    "VISION",
    image,
    visionPrompt(mode),
    signal,
    "阿里云百炼图片识别 · 最近调用成功",
  );
}

/** Handwriting transcription: one line per written row, verbatim. */
export async function recognizeHandwritingBailian(
  image: string,
  signal: AbortSignal,
): Promise<RecognizedLine[]> {
  const text = await visionText(
    "HANDWRITING",
    image,
    "识别这张图片里的手写文字。按书写行逐行输出，每行只输出该行识别到的文字；保留行首题号（如有）；保持原有错别字和书写顺序，不要纠正、不要补全、不要解释，不要输出 Markdown。",
    signal,
    "阿里云百炼手写识别 · 最近调用成功",
  );
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, id) => ({ id, text: line }));
}

/** Qwen-ASR through the OpenAI-compatible chat/completions input_audio part. */
export async function transcribeBailian(
  audio: Buffer,
  signal: AbortSignal,
) {
  const c = config("ASR");
  try {
    const mp3 = await ffmpegAudio(
      audio,
      ["-vn", "-ac", "1", "-ar", "16000", "-t", "12", "-f", "mp3", "-b:a", "48k"],
      signal,
    );
    if (!mp3.length) throw new ServiceError(400, "录音为空，请重新录制");
    const url = `data:audio/mpeg;base64,${mp3.toString("base64")}`;
    if (url.length > MAX_ASR_BYTES)
      throw new ServiceError(413, "录音过长，请分成短句后重试");
    const data = await postJSON(
      `${c.base}/chat/completions`,
      c.key,
      {
        model: c.model,
        messages: [
          {
            role: "user",
            content: [{ type: "input_audio", input_audio: { data: url } }],
          },
        ],
        stream: false,
        asr_options: { language: "zh", enable_itn: true },
      },
      signal,
      45000,
    );
    const text = (
      data.choices as { message?: { content?: unknown } }[] | undefined
    )?.[0]?.message?.content;
    if (typeof text !== "string")
      throw new ServiceError(502, "百炼没有返回识别文字");
    recordService("ASR", true, "阿里云百炼 Qwen-ASR · 最近调用成功");
    return {
      text,
      final: true,
      provider: "bailian",
      model: c.model,
    };
  } catch (error) {
    if (!(error instanceof ServiceError && error.status === 499))
      recordService(
        "ASR",
        false,
        error instanceof ServiceError ? error.message : "百炼语音识别失败",
      );
    throw error;
  }
}

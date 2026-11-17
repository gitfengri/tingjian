import { z } from "zod";

export const aiSections = [
  {
    id: "llm",
    title: "对话与 Agent",
    description:
      "清单整理、听写对话、讲解和答案对齐统一使用「阿里云百炼」分组的对话模型。模型需支持工具调用。",
  },
  {
    id: "vision",
    title: "图片文字识别",
    description: "此服务已统一使用阿里云百炼，请在「阿里云百炼」分组配置。",
  },
  {
    id: "tts",
    title: "语音朗读",
    description:
      "默认使用 Edge 在线语音，无需密钥。声音、语速和重复次数仍可在每次听写的设置中调整。",
  },
  {
    id: "tencent",
    title: "腾讯云凭据",
    description: "此服务已停用，所有能力统一使用阿里云百炼。",
  },
  {
    id: "bailian",
    title: "阿里云百炼",
    description:
      "对话、图片识别、语音识别和手写批改全部使用这组百炼配置；只需填写 API Key，模型保持默认即可。",
  },
  {
    id: "asr",
    title: "语音识别",
    description: "此服务已统一使用阿里云百炼，请在「阿里云百炼」分组配置。",
  },
  {
    id: "handwriting",
    title: "手写批改",
    description: "此服务已统一使用阿里云百炼，请在「阿里云百炼」分组配置。",
  },
  {
    id: "runtime",
    title: "本地语音依赖",
    description:
      "这些程序运行在网页服务器所在的电脑上。填可执行文件路径，不要填写命令参数。",
  },
] as const;
export type AISection = (typeof aiSections)[number]["id"];
type Field = {
  section: AISection;
  label: string;
  kind: "text" | "url" | "secret" | "select" | "path";
  default?: string;
  options?: readonly (readonly [string, string])[];
  hint?: string;
  /** Kept for server-side reads but never rendered in the settings UI. */
  hidden?: boolean;
};
const bailianOnly = [["bailian", "阿里云百炼（DashScope）"]] as const;
export const aiFields = {
  LLM_PROVIDER: {
    section: "llm",
    label: "接口协议",
    kind: "select",
    default: "bailian",
    options: bailianOnly,
    hidden: true,
  },
  LLM_BASE_URL: {
    section: "llm",
    label: "服务地址（Base URL）",
    kind: "url",
    hidden: true,
  },
  LLM_MODEL: {
    section: "llm",
    label: "模型名称",
    kind: "text",
    hidden: true,
  },
  LLM_API_KEY: {
    section: "llm",
    label: "API Key",
    kind: "secret",
    hidden: true,
  },
  LLM_TOOL_CHOICE: {
    section: "llm",
    label: "工具选择策略",
    kind: "select",
    default: "auto",
    options: [
      ["auto", "自动选择（推荐）"],
      ["required", "强制工具调用"],
    ],
    hint: "自动模式兼容 DeepSeek 思考模式；仅在服务明确支持时使用强制模式。",
  },
  VISION_PROVIDER: {
    section: "vision",
    label: "默认识别服务",
    kind: "select",
    default: "bailian",
    options: bailianOnly,
    hidden: true,
  },
  VISION_BASE_URL: {
    section: "vision",
    label: "兼容接口地址",
    kind: "url",
    hidden: true,
  },
  VISION_MODEL: {
    section: "vision",
    label: "图片识别模型",
    kind: "text",
    hidden: true,
  },
  VISION_API_KEY: {
    section: "vision",
    label: "图片识别 API Key",
    kind: "secret",
    hidden: true,
  },
  TTS_BACKEND: {
    section: "tts",
    label: "默认朗读服务",
    kind: "select",
    default: "edge-tts",
    hidden: true,
    options: [
      ["edge-tts", "Edge 在线语音"],
      ["mlx-audio", "本地 MLX / Qwen3-TTS"],
    ],
  },
  TTS_BASE_URL: {
    section: "tts",
    label: "本地语音服务地址",
    kind: "url",
    hidden: true,
  },
  TTS_API_STYLE: {
    section: "tts",
    label: "本地服务接口类型",
    kind: "select",
    default: "mlx-openai",
    hidden: true,
    options: [
      ["mlx-openai", "MLX-Audio 官方接口"],
      ["project-wrapper", "项目 FastAPI 包装服务"],
    ],
  },
  TTS_MODEL_ID: {
    section: "tts",
    label: "本地模型 ID",
    kind: "text",
    hidden: true,
  },
  TTS_SERVICE_TOKEN: {
    section: "tts",
    label: "本地服务访问令牌",
    kind: "secret",
    hidden: true,
  },
  TENCENT_SECRET_ID: {
    section: "tencent",
    label: "SecretId",
    kind: "secret",
    hidden: true,
  },
  TENCENT_SECRET_KEY: {
    section: "tencent",
    label: "SecretKey",
    kind: "secret",
    hidden: true,
  },
  TENCENT_REGION: {
    section: "tencent",
    label: "地域",
    kind: "text",
    default: "ap-guangzhou",
    hidden: true,
  },
  TENCENT_ASR_ENGINE: {
    section: "asr",
    label: "腾讯一句话识别引擎",
    kind: "text",
    default: "16k_zh",
    hidden: true,
  },
  ASR_PROVIDER: {
    section: "asr",
    label: "语音识别服务",
    kind: "select",
    default: "bailian",
    options: bailianOnly,
    hidden: true,
  },
  ASR_BASE_URL: {
    section: "asr",
    label: "兼容接口地址",
    kind: "url",
    hidden: true,
  },
  ASR_MODEL: {
    section: "asr",
    label: "语音识别模型",
    kind: "text",
    hidden: true,
  },
  ASR_API_KEY: {
    section: "asr",
    label: "语音识别 API Key",
    kind: "secret",
    hidden: true,
  },
  HANDWRITING_PROVIDER: {
    section: "handwriting",
    label: "手写识别服务",
    kind: "select",
    default: "bailian",
    options: bailianOnly,
    hidden: true,
  },
  HANDWRITING_BASE_URL: {
    section: "handwriting",
    label: "兼容接口地址",
    kind: "url",
    hidden: true,
  },
  HANDWRITING_MODEL: {
    section: "handwriting",
    label: "手写识别模型",
    kind: "text",
    hidden: true,
  },
  HANDWRITING_API_KEY: {
    section: "handwriting",
    label: "手写识别 API Key",
    kind: "secret",
    hidden: true,
  },
  BAILIAN_API_KEY: {
    section: "bailian",
    label: "百炼 API Key",
    kind: "secret",
  },
  BAILIAN_BASE_URL: {
    section: "bailian",
    label: "服务地址（Base URL）",
    kind: "url",
    default: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    hint: "北京地域默认地址；使用业务空间专属域名时替换为 https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1。",
  },
  BAILIAN_LLM_MODEL: {
    section: "bailian",
    label: "百炼对话模型",
    kind: "text",
    default: "qwen-plus",
    hint: "用于清单整理、讲解和听写对话，需支持工具调用，例如 qwen-plus、qwen-max。",
  },
  BAILIAN_VISION_MODEL: {
    section: "bailian",
    label: "百炼图片识别模型",
    kind: "text",
    default: "qwen-vl-ocr",
    hint: "例如 qwen-vl-ocr、qwen-vl-max-latest；需支持图片输入。",
  },
  BAILIAN_ASR_MODEL: {
    section: "bailian",
    label: "百炼语音识别模型",
    kind: "text",
    default: "qwen3-asr-flash",
    hint: "使用 OpenAI 兼容 chat/completions 的 input_audio 输入。",
  },
  BAILIAN_HANDWRITING_MODEL: {
    section: "bailian",
    label: "百炼手写识别模型",
    kind: "text",
    default: "qwen-vl-ocr",
    hint: "识别手写原文并逐行输出，再由对话模型与标准答案对齐；例如 qwen-vl-ocr、qwen3-vl-plus。",
  },
  EDGE_TTS_PYTHON: {
    section: "runtime",
    label: "Edge TTS Python 路径",
    kind: "path",
    default: "python3",
    hint: "需已安装 edge-tts，例如 services/edge/.venv/bin/python。",
  },
  FFMPEG_PATH: {
    section: "runtime",
    label: "FFmpeg 路径",
    kind: "path",
    default: "ffmpeg",
    hint: "留空或填 ffmpeg 时从服务器 PATH 查找。",
  },
} as const satisfies Record<string, Field>;
export type AIKey = keyof typeof aiFields;
export const aiKeys = Object.keys(aiFields) as AIKey[];
export const secretKeys = aiKeys.filter(
  (key) => aiFields[key].kind === "secret",
);
export type AIValues = Record<AIKey, string>;
export type AIPatch = Partial<Record<AIKey, string | null>>;
export type PublicAISettings = {
  revision: string;
  values: Partial<Record<AIKey, string>>;
  inheritedValues: Partial<Record<AIKey, string>>;
  secrets: Partial<Record<AIKey, boolean>>;
  inheritedSecrets: Partial<Record<AIKey, boolean>>;
  overridden: AIKey[];
};

const fieldSchemas = Object.fromEntries(
  aiKeys.map((key) => {
    const field: Field = aiFields[key];
    const schema = z
      .string()
      .trim()
      .max(field.kind === "secret" ? 12000 : 2000)
      .refine(
        (value) => !/[\u0000-\u001f\u007f]/.test(value),
        `${field.label}不能包含换行或控制字符`,
      )
      .refine((value) => {
        if (!value) return field.kind !== "select";
        if (field.options)
          return field.options.some(([option]) => option === value);
        if (field.kind === "url") {
          try {
            const url = new URL(value);
            return (
              ["https:", "http:"].includes(url.protocol) &&
              !url.username &&
              !url.password &&
              !url.hash &&
              !url.search
            );
          } catch {
            return false;
          }
        }
        if (field.kind === "path") {
          const name = value.split(/[\\/]/).at(-1) || "";
          return key === "FFMPEG_PATH"
            ? /^ffmpeg(?:\.exe)?$/.test(name)
            : /^python(?:3(?:\.\d+)?)?(?:\.exe)?$/.test(name);
        }
        return true;
      }, `${field.label}格式不正确`);
    return [key, schema.nullable().optional()];
  }),
) as Record<
  AIKey,
  z.ZodOptional<z.ZodNullable<z.ZodString | z.ZodType<string>>>
>;
export const aiPatchSchema = z.object(fieldSchemas).strict();
export const aiSaveSchema = z
  .object({
    revision: z.string().min(1).max(120),
    changes: aiPatchSchema,
    reuseSecrets: z
      .array(z.enum(aiKeys as [AIKey, ...AIKey[]]))
      .max(aiKeys.length)
      .default([]),
  })
  .strict();

export const endpointSecrets = {
  LLM_BASE_URL: "LLM_API_KEY",
  VISION_BASE_URL: "VISION_API_KEY",
  ASR_BASE_URL: "ASR_API_KEY",
  HANDWRITING_BASE_URL: "HANDWRITING_API_KEY",
  TTS_BASE_URL: "TTS_SERVICE_TOKEN",
} as const;
export function differentOrigin(a: string, b: string) {
  if (!a || !b) return false;
  try {
    return new URL(a).origin !== new URL(b).origin;
  } catch {
    return false;
  }
}

export function inheritedAIValues(
  environment: Record<string, string | undefined>,
): AIValues {
  const result = Object.fromEntries(
    aiKeys.map((key) => [
      key,
      environment[key]?.trim() || (aiFields[key] as Field).default || "",
    ]),
  ) as AIValues;
  return result;
}

const isHiddenKey = (key: AIKey) => Boolean((aiFields[key] as Field).hidden);
/** Keys the settings UI renders; hidden legacy providers are excluded. */
export const visibleAIKeys = aiKeys.filter((key) => !isHiddenKey(key));
/** Sections that still contain at least one visible field. */
export const visibleAISections = aiSections.filter((item) =>
  visibleAIKeys.some((key) => aiFields[key].section === item.id),
);

import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire, registerHooks } from "node:module";
import { pathToFileURL } from "node:url";

const testRequire = createRequire(import.meta.url);
const marker = pathToFileURL(
  testRequire.resolve("next/dist/compiled/server-only/empty.js"),
).href;
const hooks = registerHooks({
  resolve(specifier, context, next) {
    return specifier === "server-only"
      ? { url: marker, shortCircuit: true }
      : next(specifier, context);
  },
});
let directory: string;
const saved = { ...process.env };
before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "tingjian-bailian-"));
  // Keep tests away from the developer's real web settings file.
  process.env.AI_SETTINGS_FILE = path.join(directory, "runtime.json");
  for (const key of [
    "VISION_PROVIDER",
    "ASR_PROVIDER",
    "LLM_PROVIDER",
    "LLM_BASE_URL",
    "LLM_API_KEY",
    "LLM_MODEL",
    "VISION_API_KEY",
    "VISION_MODEL",
    "VISION_BASE_URL",
    "ASR_API_KEY",
    "ASR_MODEL",
    "ASR_BASE_URL",
    "TENCENT_SECRET_ID",
    "TENCENT_SECRET_KEY",
  ])
    delete process.env[key];
  process.env.BAILIAN_API_KEY = "sk-bailian-test";
});
after(async () => {
  hooks.deregister();
  for (const [key, value] of Object.entries(saved))
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  await rm(directory, { recursive: true, force: true });
});

test("a Bailian key selects Bailian for vision and ASR by default", async () => {
  const { inheritedAIValues } = await import("../lib/ai-settings");
  const values = inheritedAIValues({
    BAILIAN_API_KEY: "sk-bailian-test",
  });
  assert.equal(values.VISION_PROVIDER, "bailian");
  assert.equal(values.ASR_PROVIDER, "bailian");
  assert.equal(values.LLM_PROVIDER, "bailian");
  assert.equal(
    values.BAILIAN_BASE_URL,
    "https://dashscope.aliyuncs.com/compatible-mode/v1",
  );
  assert.equal(values.BAILIAN_LLM_MODEL, "qwen-plus");
  assert.equal(values.BAILIAN_VISION_MODEL, "qwen-vl-ocr");
  assert.equal(values.BAILIAN_ASR_MODEL, "qwen3-asr-flash");
});

test("Tencent credentials still win over Bailian defaults", async () => {
  const { inheritedAIValues } = await import("../lib/ai-settings");
  const values = inheritedAIValues({
    BAILIAN_API_KEY: "sk-bailian-test",
    TENCENT_SECRET_ID: "id",
    TENCENT_SECRET_KEY: "key",
  });
  assert.equal(values.VISION_PROVIDER, "tencent");
  assert.equal(values.ASR_PROVIDER, "tencent");
});

test("Bailian service config resolves shared key, base URL and model defaults", async () => {
  process.env.VISION_PROVIDER = "bailian";
  process.env.ASR_PROVIDER = "bailian";
  const { config } = await import("../lib/server");
  const vision = config("VISION");
  assert.equal(vision.base, "https://dashscope.aliyuncs.com/compatible-mode/v1");
  assert.equal(vision.key, "sk-bailian-test");
  assert.equal(vision.model, "qwen-vl-ocr");
  assert.equal(vision.provider, "bailian");
  const asr = config("ASR");
  assert.equal(asr.model, "qwen3-asr-flash");
});

test("legacy per-service fields never leak into Bailian requests", async () => {
  process.env.VISION_PROVIDER = "bailian";
  process.env.VISION_MODEL = "xoppaddleocrv16";
  process.env.VISION_BASE_URL =
    "https://maas-api.cn-huabei-1.xf-yun.com/v2";
  process.env.VISION_API_KEY = "legacy-key";
  const { config } = await import("../lib/server");
  const vision = config("VISION");
  assert.equal(vision.model, "qwen-vl-ocr");
  assert.equal(
    vision.base,
    "https://dashscope.aliyuncs.com/compatible-mode/v1",
  );
  assert.equal(vision.key, "sk-bailian-test");
});

test("Bailian without a key fails with an actionable message", async () => {
  process.env.ASR_PROVIDER = "bailian";
  delete process.env.BAILIAN_API_KEY;
  const { config } = await import("../lib/server");
  assert.throws(
    () => config("ASR"),
    /阿里云百炼未配置 API Key/,
  );
  process.env.BAILIAN_API_KEY = "sk-bailian-test";
});

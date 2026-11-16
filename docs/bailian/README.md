# 阿里云百炼接入（V0.0.1）

本分支把阿里云百炼（Model Studio / DashScope）作为一等服务商接入，用于对话、图片识别和语音识别。手写批改仍使用腾讯手写识别。

## 服务对应关系

| 能力 | 百炼模型 | 接口 |
| --- | --- | --- |
| AI 辅助出题、清单整理、讲解、听写对话 | `qwen-plus`（可换 `qwen-max` 等支持工具调用的模型） | OpenAI 兼容 `POST {base}/chat/completions` |
| 拍照 / 圈选图片识别 | `qwen-vl-ocr`（可换 `qwen-vl-max-latest`） | 同上，`image_url` 传入图片 Data URL |
| 麦克风语音识别 | `qwen3-asr-flash` | 同上，`input_audio` 传入音频 Data URL |
| 手写批改 | `qwen-vl-ocr`（可在「阿里云百炼」分组改模型） | 先逐行识别手写原文，再由对话模型与标准答案对齐 |

`base` 默认是 `https://dashscope.aliyuncs.com/compatible-mode/v1`。若使用业务空间专属域名，可改为
`https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1`。

## 配置方式

网页「服务与设置 → AI 服务配置」：

1. 打开「阿里云百炼」分组，填写 **百炼 API Key**，其余保持默认即可。
2. 在「对话与 Agent」「图片文字识别」「语音识别」中把服务选为 **阿里云百炼（DashScope）**。
   选择后只使用「阿里云百炼」分组的地址、密钥与模型；各分类里原有的服务地址/模型字段属于其他服务商，不再生效。
3. 保存后新请求立即生效，无需重启。

也可以写入 `.env.local`：

```bash
BAILIAN_API_KEY=sk-xxx
BAILIAN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
BAILIAN_LLM_MODEL=qwen-plus
BAILIAN_VISION_MODEL=qwen-vl-ocr
BAILIAN_ASR_MODEL=qwen3-asr-flash
```

仅配置 `BAILIAN_API_KEY` 时，服务启动会优先把视觉与语音识别指向百炼（存在腾讯云凭据时仍优先腾讯）。

## 与腾讯方案的差异

- **视觉识别不返回文字坐标**：只能按行输出，无法可靠恢复词表列。页面会给出提示，词表场景建议改用腾讯版面识别。
  本分支让百炼识别按内容模式输出：词语表每行一个词、短语每行一个短语、句子每行一句，以减少后续手工拆分。
- **语音识别的音频会先用 FFmpeg 转成 16 kHz 单声道 MP3**（最长 12 秒，Base64 后不超过 10 MB），再提交给 Qwen-ASR。
- **手写批改**默认与图片识别同源：`qwen-vl-ocr` 逐行输出手写原文（保留错别字，不修正），再由对话模型把文本行与标准答案对齐；
  百炼不返回置信度，因此没有“置信度低于 80”的复核提示，全部结果仍需人工确认。仍可在设置里切回腾讯手写识别（需腾讯云凭据）。
- 朗读默认仍是 Edge 在线语音，未改变。

## 验证

```bash
npm run typecheck
npm test                     # tests/bailian.test.ts 覆盖配置解析与默认值
```

真实调用验证：启动 `npm run dev` 后，在「服务与设置」保存百炼密钥，执行：
- 对话：「测试已保存模型」
- 语音识别：打开听写对话并说一句话
- 图片识别：上传一张词表图片并选择「阿里云百炼 · Qwen 视觉模型」

`/api/health` 会显示每个服务的实际服务商与模型 ID。

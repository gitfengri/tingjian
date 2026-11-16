# Docker 部署（Ubuntu + GitHub Actions）

镜像内已包含 Node.js、FFmpeg 和 edge-tts（Python venv），服务器只需要 Docker，不需要单独安装 Node 或 Python。

## 1. 推到自己的仓库

在项目目录执行（把地址换成你自己的仓库）：

```bash
git remote rename origin upstream          # 保留原始仓库为 upstream（可选）
git remote add origin git@github.com:<你的用户名>/tingjian.git
git push -u origin V0.0.1
git push origin main                        # 如果 main 也要推
```

## 2. GitHub Actions 自动构建

`.github/workflows/docker.yml` 会在推送到 `main` / `V0.0.1` 或打 `v*` 标签时构建并推送镜像到 GHCR：

```
ghcr.io/<你的用户名>/<仓库名>:V0.0.1
ghcr.io/<你的用户名>/<仓库名>:latest     # 仅 main
ghcr.io/<你的用户名>/<仓库名>:sha-xxxxxxx
```

首次推送后：

1. 打开仓库 → Actions，确认 `Docker image` 工作流成功。
2. 打开仓库 → Packages，把该镜像设为 **Public**；若保持私有，服务器需要先登录：

```bash
echo <你的 GitHub PAT，至少 read:packages> | docker login ghcr.io -u <用户名> --password-stdin
```

也可以在服务器上直接构建，不依赖 GHCR：

```bash
docker compose build
```

### 改用阿里云 ACR（国内服务器推荐，拉取更快）

本机（Windows/macOS）构建好镜像后推到 ACR：

```bash
docker login registry.cn-shenzhen.aliyuncs.com -u <账号或 用户名@实例名>
# 包管理版实例/个人版：用户名是阿里云账号全名；企业版：用户名@实例名
docker tag tingjian:v001 registry.cn-shenzhen.aliyuncs.com/codelabclub/tingjian:v001
docker push registry.cn-shenzhen.aliyuncs.com/codelabclub/tingjian:v001
```

推送前确认架构与服务器一致（x86 服务器必须是 `linux/amd64`）：

```bash
docker image inspect tingjian:v001 --format '{{.Os}}/{{.Architecture}}'
```

服务器上登录并指定镜像启动（`APP_IMAGE` 会覆盖 compose 里的默认镜像名）：

```bash
docker login registry.cn-shenzhen.aliyuncs.com -u <账号>
APP_IMAGE=registry.cn-shenzhen.aliyuncs.com/codelabclub/tingjian:v001 docker compose up -d
```

想长期固定这个镜像，把下面一行写进 `.env.local`，之后 `docker compose pull && docker compose up -d` 即可更新：

```bash
APP_IMAGE=registry.cn-shenzhen.aliyuncs.com/codelabclub/tingjian:v001
```

> 同地域 ECS 可把域名换成 `registry-vpc.cn-shenzhen.aliyuncs.com` 走内网，速度更快且不计公网流量。

## 3. 服务器准备（Ubuntu 22.04/24.04）

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"   # 重新登录后生效
docker version && docker compose version
```

## 4. 配置并启动

```bash
git clone https://github.com/<你的用户名>/tingjian.git
cd tingjian
cp .env.example .env.local
```

编辑 `.env.local`，最少需要：

```bash
BAILIAN_API_KEY=sk-...
APP_ACCESS_TOKEN=<至少 24 位的随机口令>
# 可选：改用业务空间专属域名
# BAILIAN_BASE_URL=https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1
```

> `APP_ACCESS_TOKEN` 是必填项：除 localhost 外，所有 `/api` 请求都要带 `Authorization: Bearer <口令>`，否则返回 403。网页首次打开时会要求输入这个口令。

启动：

```bash
docker compose pull
docker compose up -d
docker compose ps
docker compose logs -f app
```

验证：

```bash
curl http://127.0.0.1:3000/api/health            # 若已设口令，加 -H "Authorization: Bearer $APP_ACCESS_TOKEN"
```

默认只监听 `127.0.0.1:3000`，适合通过 SSH 隧道访问：

```bash
ssh -L 3000:127.0.0.1:3000 <user>@<server>
# 本机打开 http://localhost:3000
```

需要局域网直接访问时，在 `.env.local` 或命令行设置 `BIND_ADDR=0.0.0.0`（仍会受 APP_ACCESS_TOKEN 保护）。

> **从 Windows 迁移 `.env.local` 时注意**：如果里面保留了 `EDGE_TTS_PYTHON=services/edge/.venv/Scripts/python.exe` 或 `FFMPEG_PATH=E:/...` 这类本机路径，容器里是不存在的。`docker-compose.yml` 已经在 `environment:` 里把 `EDGE_TTS_PYTHON=/opt/edge/bin/python`、`FFMPEG_PATH=/usr/bin/ffmpeg`、`BIND_HOST=0.0.0.0` 固定下来（其优先级高于 `env_file`），所以直接 `docker compose up -d` 不会出问题；但如果用 `docker run --env-file .env.local` 手动启动，请记得额外 `-e` 覆盖这三个变量。

### 服务器上没有仓库代码时（只用镜像启动）

镜像已内置 Node、FFmpeg 和 edge-tts，不需要克隆仓库，直接：

```bash
mkdir -p ~/tingjian && cd ~/tingjian
cat > .env <<'EOF'
BAILIAN_API_KEY=sk-...
BAILIAN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
APP_ACCESS_TOKEN=<至少 24 位随机口令>
EOF
chmod 600 .env

docker run -d --name tingjian --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  --env-file .env \
  -e EDGE_TTS_PYTHON=/opt/edge/bin/python \
  -e FFMPEG_PATH=/usr/bin/ffmpeg \
  -e BIND_HOST=0.0.0.0 \
  -e MINI_DATABASE_FILE=/app/.local/miniprogram.sqlite \
  -v tingjian-data:/app/.local \
  registry.cn-shenzhen.aliyuncs.com/codelabclub/tingjian:v001
```

更新镜像时重建容器（数据在 `tingjian-data` 卷里不会丢）：

```bash
docker pull registry.cn-shenzhen.aliyuncs.com/codelabclub/tingjian:v001
docker rm -f tingjian && <上面的 docker run 命令>
```

## 5. 绑定域名与 HTTPS

麦克风和部分摄像头接口只在 HTTPS 或 localhost 下可用，手机使用务必配置 HTTPS。

```bash
# .env.local
APP_DOMAIN=study.example.com
```

```bash
docker compose --profile https up -d
```

Caddy 会自动申请证书并反代到 `app:3000`，请求体上限 17MB（与图片上传限制一致）。域名需先解析到服务器公网 IP，并放行 80/443。

已有 Nginx 时，把 `deploy/nginx-existing.conf` 里的域名与证书换成自己的，`proxy_pass http://127.0.0.1:3000;`，并保持 `Host` 头即可（应用会校验同源）。

## 6. 更新与回滚

```bash
git pull
docker compose pull
docker compose up -d
```

回滚到某个提交的镜像：

```bash
docker compose down
APP_IMAGE=ghcr.io/<用户名>/<仓库>:sha-abc1234 docker compose up -d
```

## 7. 数据与备份

持久化数据在 Docker 卷 `study-data`，挂载到容器 `/app/.local`：

- `ai-settings.json`：网页「服务与设置」保存的 AI 配置（**含密钥**）
- `miniprogram.sqlite`：小程序用户与额度（如启用）

备份：

```bash
docker run --rm -v tingjian_study-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/study-data-$(date +%F).tgz -C /data .
```

> 卷名前缀取自目录名（默认 `tingjian_study-data`），用 `docker volume ls` 确认。

## 8. 常见问题

| 现象 | 原因与处理 |
| --- | --- |
| 打开页面提示 403 | 用 IP/域名访问但没带口令：在网页里输入 `APP_ACCESS_TOKEN`，或通过 SSH 隧道用 localhost |
| 语音识别报“需要 FFmpeg” | 镜像已内置，检查是否覆盖了 `FFMPEG_PATH` |
| 朗读无声或失败 | Edge 在线语音需要容器可访问外网（`dashscope`/微软 TTS 域名） |
| 容器已启动但浏览器连不上 | 容器内没监听 `0.0.0.0`（未设 `BIND_HOST`）。镜像默认已设为 `0.0.0.0`，若被 `.env.local` 覆盖请删掉该行 |
| 图片识别失败 | 检查百炼 Key、模型名（`qwen-vl-ocr`）与账号额度 |
| 手机麦克风不可用 | 未使用 HTTPS：按第 5 节配置域名 |
| 容器反复重启 | `docker compose logs app` 查看；多为 `.env.local` 缺失 `APP_ACCESS_TOKEN` |

# 部署说明

通用自托管（Docker + 可选 Caddy HTTPS）已统一到仓库根目录：

- `Dockerfile`
- `docker-compose.yml`
- `Caddyfile`
- 文档：[docs/deploy/docker.md](../docs/deploy/docker.md)

`nginx-existing.conf` 保留给已有 Nginx 的服务器参考：把域名、证书替换为自己的，并把 `proxy_pass` 指向 `http://127.0.0.1:3000`，保留 `Host` 头即可。

> 旧的 `deploy/Dockerfile`、`deploy/compose.yml`、`deploy/Caddyfile` 只反代小程序 `/api/mini/*`，与完整网页自托管需求冲突，已由根目录方案取代（历史版本仍可在 git 中找到）。

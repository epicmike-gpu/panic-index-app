#!/bin/bash
# 香港服务器一键部署脚本（适用于 Ubuntu 22.04 / 24.04）
# 作用：安装 Caddy 并配置反向代理到 Vercel 后端
# 用法：sudo bash setup.sh api.yourdomain.com   （换成你的域名）

set -e

DOMAIN="${1:-api.yourdomain.com}"
UPSTREAM="panic-index-app.vercel.app"

echo "==> 目标域名: $DOMAIN"
echo "==> 上游后端: $UPSTREAM"

# 1. 安装 Caddy
echo "==> 安装 Caddy..."
if ! command -v caddy >/dev/null 2>&1; then
  apt-get update
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl gpg || true
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update
  apt-get install -y caddy
fi

# 2. 写入 Caddyfile
echo "==> 写入 /etc/caddy/Caddyfile ..."
cat > /etc/caddy/Caddyfile <<EOF
$DOMAIN {
	reverse_proxy https://$UPSTREAM {
		header_up Host $UPSTREAM
		header_up X-Forwarded-For {remote_host}
	}
}
EOF

# 3. 放行防火墙端口（若启用了 ufw）
if command -v ufw >/dev/null 2>&1; then
  echo "==> 放行 80/443 ..."
  ufw allow 80/tcp || true
  ufw allow 443/tcp || true
fi

# 4. 启动并设为开机自启
echo "==> 启动 Caddy ..."
systemctl enable caddy
systemctl restart caddy

echo ""
echo "==============================================="
echo " 部署完成！Caddy 正在自动申请 HTTPS 证书。"
echo " 请确认域名 $DOMAIN 的 DNS A 记录已指向本服务器 IP。"
echo ""
echo " 验证（在国内网络、不开代理下执行）："
echo "   curl https://$DOMAIN/api/v1/health"
echo " 应返回: {\"status\":\"ok\"}"
echo "==============================================="

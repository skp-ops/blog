#!/usr/bin/env bash

set -euo pipefail

SCRIPT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_ROOT"

SITE_HOST="127.0.0.1"
SITE_PORT="${BLOG_SITE_PORT:-4321}"
STUDIO_PORT="4322"
REQUIRED_NODE_MAJOR="18"
REQUIRED_NODE_MINOR="20"
REQUIRED_NODE_PATCH="8"

usage() {
  printf '%s\n' \
    "用法：./start.command [site|studio]" \
    "" \
    "  site    启动测试网站  http://$SITE_HOST:$SITE_PORT/" \
    "  studio  启动内容工作台  http://$SITE_HOST:$STUDIO_PORT/admin/" \
    "" \
    "不传参数时会显示启动菜单。"
}

node_is_supported() {
  local candidate="$1"
  local version
  local major
  local minor
  local patch

  [[ -n "$candidate" && -x "$candidate" ]] || return 1
  version="$("$candidate" -p 'process.versions.node' 2>/dev/null)" || return 1
  IFS=. read -r major minor patch _ <<< "$version"

  [[ "$major" =~ ^[0-9]+$ && "$minor" =~ ^[0-9]+$ && "$patch" =~ ^[0-9]+$ ]] || return 1
  if (( major > REQUIRED_NODE_MAJOR )); then
    return 0
  fi
  if (( major == REQUIRED_NODE_MAJOR
    && (minor > REQUIRED_NODE_MINOR
      || (minor == REQUIRED_NODE_MINOR && patch >= REQUIRED_NODE_PATCH)) )); then
    return 0
  fi
  return 1
}

find_node() {
  local current_node
  local candidate
  local candidates=()

  current_node="$(command -v node 2>/dev/null || true)"
  [[ -n "${BLOG_NODE_BIN:-}" ]] && candidates+=("$BLOG_NODE_BIN")
  [[ -n "$current_node" ]] && candidates+=("$current_node")
  candidates+=("/opt/homebrew/bin/node" "/usr/local/bin/node")

  shopt -s nullglob
  candidates+=("$HOME"/.nvm/versions/node/*/bin/node)
  candidates+=("$HOME"/.local/share/fnm/node-versions/*/installation/bin/node)
  candidates+=("$HOME"/.cache/codex-runtimes/*/dependencies/node/bin/node)
  shopt -u nullglob

  for candidate in "${candidates[@]}"; do
    if node_is_supported "$candidate"; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  return 1
}

resolve_runtime() {
  local node_version
  local corepack_bin
  local pnpm_bin
  local modules_stamp="node_modules/.modules.yaml"

  if ! NODE_BIN="$(find_node)"; then
    printf '%s\n' \
      "未找到可用的 Node.js。项目至少需要 Node.js ${REQUIRED_NODE_MAJOR}.${REQUIRED_NODE_MINOR}.${REQUIRED_NODE_PATCH}。" \
      "请安装新版 Node.js，或通过 BLOG_NODE_BIN 指定 node 可执行文件。" >&2
    exit 1
  fi

  export PATH="$(dirname "$NODE_BIN"):$PATH"
  node_version="$("$NODE_BIN" --version)"

  if corepack_bin="$(command -v corepack 2>/dev/null)"; then
    PNPM_CMD=("$corepack_bin" "pnpm")
  elif pnpm_bin="$(command -v pnpm 2>/dev/null)"; then
    PNPM_CMD=("$pnpm_bin")
  else
    printf '%s\n' "未找到 pnpm 或 corepack，请先安装 Node.js / pnpm。" >&2
    exit 1
  fi

  if [[ ! -f "$modules_stamp" \
    || package.json -nt "$modules_stamp" \
    || pnpm-lock.yaml -nt "$modules_stamp" \
    || ! -x node_modules/.bin/astro \
    || ! -x node_modules/.bin/tsx ]]; then
    printf '检测到依赖需要更新，正在安装…\n'
    "${PNPM_CMD[@]}" install --frozen-lockfile
  fi

  printf '使用 Node %s（%s）\n' "$node_version" "$NODE_BIN"
}

port_is_busy() {
  local port="$1"
  command -v lsof >/dev/null 2>&1 \
    && lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

ensure_port_available() {
  local port="$1"
  local label="$2"

  if port_is_busy "$port"; then
    printf '端口 %s 已被占用，无法启动%s。\n' "$port" "$label" >&2
    printf '请先关闭占用该端口的进程后重试。\n' >&2
    exit 1
  fi
}

start_site() {
  ensure_port_available "$SITE_PORT" "测试网站"
  printf '正在启动测试网站：http://%s:%s/\n' "$SITE_HOST" "$SITE_PORT"
  if [[ "${BLOG_NO_OPEN:-0}" == "1" ]]; then
    exec "${PNPM_CMD[@]}" exec astro dev \
      --host "$SITE_HOST" \
      --port "$SITE_PORT"
  else
    exec "${PNPM_CMD[@]}" exec astro dev \
      --host "$SITE_HOST" \
      --port "$SITE_PORT" \
      --open "/"
  fi
}

start_studio() {
  ensure_port_available "$STUDIO_PORT" " Content Studio"
  printf '正在启动 Content Studio：http://%s:%s/admin/\n' "$SITE_HOST" "$STUDIO_PORT"
  printf 'Studio 启动后也会在同一地址提供完整网站预览。\n'
  exec "${PNPM_CMD[@]}" studio
}

show_menu() {
  while true; do
    printf '\n%s\n' "Kun's Blog 本地工具"
    printf '%s\n' \
      "  1. 启动测试网站" \
      "  2. 启动 Content Studio（写文章）" \
      "  3. 退出"
    printf '请选择 [1-3]：'
    read -r choice

    case "$choice" in
      1) start_site ;;
      2) start_studio ;;
      3) exit 0 ;;
      *) printf '请输入 1、2 或 3。\n' ;;
    esac
  done
}

case "${1:-}" in
  site|web)
    resolve_runtime
    start_site
    ;;
  studio|write)
    resolve_runtime
    start_studio
    ;;
  -h|--help|help)
    usage
    ;;
  "")
    if [[ -t 0 ]]; then
      resolve_runtime
      show_menu
    else
      usage
      exit 2
    fi
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac

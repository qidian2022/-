#!/bin/zsh
set -e

cd "${0:A:h}"

if ! command -v npm >/dev/null 2>&1; then
  echo "没有找到 Node.js / npm。请先安装 Node.js，然后重新打开此文件。"
  read -r '?按回车键关闭窗口。'
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "首次启动，正在安装所需组件……"
  npm ci
fi

echo "正在启动科目一刷题网页。使用期间请保持此窗口开启。"
npm run dev -- --host 127.0.0.1 --port 5173 --open

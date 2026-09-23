# 稳稳过 · 科目一刷题

电脑浏览器优先的科目一练习网页。包含 1844 道题、即时对错反馈、解析、题图和本地收藏。

## 使用

```bash
npm ci
npm run dev
```

打开终端显示的本地地址。答题记录、随机题序与收藏保存在当前浏览器；“重新开始”会清除答题记录并重新排题，收藏会保留。

## 开发与检查

```bash
npm test
npm run build
```

`npm run dev` 和 `npm run build` 会从 `data/题库.md` 生成网页用的 JSON。转换过程检查题目数量、答案、题图路径和重复题号。生成文件位于 `src/generated/`，无需手动编辑。

## 发布

推送到 `main` 后，GitHub Actions 会构建并部署到 GitHub Pages。首次发布时，在仓库 Settings → Pages 中将 Source 设为 **GitHub Actions**。部署构建使用 `/kemuyi-practice/` 作为资源路径。

## 内容与许可

程序代码使用 MIT 许可。题库、解析和图片的来源及授权说明见 [DATA-NOTICE.md](DATA-NOTICE.md)。题库采集于 2026-09-23，内容未经官方核验。

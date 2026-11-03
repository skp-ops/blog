# Kun's Blog

Astro 博客，内容源位于 `src/content/`，使用 GitHub 仓库保存和发布。

## 快速启动

在 Finder 中双击 `start.command`，选择启动测试网站或 Content Studio。也可以在终端直接启动：

```bash
./start.command site
./start.command studio
```

测试网站运行在 `http://127.0.0.1:4321/`，Content Studio 运行在 `http://127.0.0.1:4322/admin/`。脚本会自动寻找兼容的 Node.js，并在依赖清单更新后安装依赖。

## 内容工作台

运行：

```bash
pnpm studio
```

需要 Node.js 18.20.8 或更高版本。命令会启动只监听 `127.0.0.1` 的本地 Content Studio，并打开 `/admin/`。工作台直接读取当前工作区的文章、说说和画廊内容，支持编辑、新建和删除。修改先保存在页面工作副本中，点击“提交到 Git”后会写入本地文件、创建一次 Git 提交，并尝试推送到当前分支的远端。

编辑器提供 Markdown 分栏实时预览、格式工具栏、字数统计、草稿/改动筛选和图片上传。输入会自动保存为浏览器草稿，刷新或误关页面后可以恢复；新建内容时填写的文件路径也会一并恢复。图片支持拖入上传框或从本地选择，也可以直接粘贴或拖进正文自动插入 Markdown，并会随内容一起进入同一次 Git 提交。

标签和系列统一保存在 `src/content/taxonomy.json`，通过编辑器顶部的“标签与系列”管理。文章只能从管理后的标签中多选，并且只能选择一个系列；重命名或删除时会同步更新关联文章。说说的标签和备注不会在网站展示，因此编辑器中不再提供这两个字段。上传的图片会立即写入 `public/gallery/uploads`，提交内容时会自动加入 Git 提交。

写作快捷键：`⌘S` 保存工作副本，`⌘↵` 自动保存并打开提交确认，`⌘⇧F` 进入或退出专注写作模式，`Esc` 退出专注模式。正文支持 `Tab`/`⇧Tab` 缩进、`⌘B` 粗体、`⌘I` 斜体、`⌘K` 链接，以及回车自动续写列表。

管理页面和本地内容接口只在 `pnpm studio` 模式下注入，普通 `pnpm dev`、生产构建和线上博客都不会包含它们。编辑器只提交 `src/content/posts`、`src/content/notes`、`src/content/photos/photos.json`、`src/content/taxonomy.json` 和工作台上传的 `public/gallery/uploads` 图片，不会处理工作区中的其他修改。

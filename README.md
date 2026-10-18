# Kun's Blog

Astro 博客，内容源位于 `src/content/`，使用 GitHub 仓库保存和发布。

## 内容工作台

运行：

```bash
pnpm studio
```

需要 Node.js 18.20.8 或更高版本。命令会启动只监听 `127.0.0.1` 的本地 Content Studio，并打开 `/admin/`。工作台直接读取当前工作区的文章、说说和画廊内容，支持编辑、新建和删除。修改先保存在页面工作副本中，点击“提交到 Git”后会写入本地文件、创建一次 Git 提交，并尝试推送到当前分支的远端。

管理页面和本地内容接口只在 `pnpm studio` 模式下注入，普通 `pnpm dev`、生产构建和线上博客都不会包含它们。编辑器只提交 `src/content/posts`、`src/content/notes` 和 `src/content/photos/photos.json` 下的内容，不会处理工作区中的其他修改。

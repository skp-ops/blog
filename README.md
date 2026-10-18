# Kun's Blog

Astro 博客，内容源位于 `src/content/`，使用 GitHub 仓库保存和发布。

## 内容工作台

访问 `/admin/` 打开 Content Studio，可直接读取 GitHub 上最新的文章、说说和画廊数据，并支持编辑、新建和删除。修改会先保存在当前页面的工作副本中，点击“提交到 Git”后合并为一次 Git 提交，继续沿用仓库原有的部署流程。

首次提交前需要：

1. 在 Git 设置中确认仓库和发布分支。
2. 填写 Fine-grained personal access token。
3. 给目标仓库开启 `Contents: Read and write` 权限。

Token 只保存在当前标签页的 `sessionStorage` 中，不会写入仓库。未填写 Token 时可以匿名读取公开仓库，但无法提交修改。

仓库、分支和页脚入口可在 `src/config.ts` 的 `admin` 配置中调整。

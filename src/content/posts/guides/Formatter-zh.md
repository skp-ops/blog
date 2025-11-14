---
title: Markdown Formatter
published: 2025-11-14
tags:
  - Guide
toc: false # outline
lang: zh
abbrlink: markdown-formatter
draft: true
---

概览：frontmatter 是什么
frontmatter 是放在 Markdown 文档顶部、被 ---（或 +++ 用于 TOML）包起来的一段元数据（通常是 YAML 格式）。
Astro 会把它解析为对象（叫 frontmatter / data / attributes），导入或通过内容集合读取时可以访问到这些字段。字段本身是任意的，但常见字段约定俗成，被站点脚本、布局或构建插件使用（例如生成列表、RSS、OG 图等）。
支持的格式
常见是 YAML（用 ---）。也可以用 TOML（+++）或 JSON（少见）。多数项目用 YAML。
常见字段与用途（按用途分组）
标识与展示
title: 页面/文章标题（string） — 用于页面标题、列表、OG 标题。
description / summary / excerpt: 摘要（string） — 用于 meta 描述、列表摘要。
image / ogImage: 页面主图（string，路径或 url） — 用于 Open Graph / 社交分享。
lang: 语言代码（如 'en'/'zh'） — 多语言站点用来生成对应语言页。
slug: 自定义的 URL 段（string） — 可用于构建 permalink。
发布与时间
date / pubDate / published: 发布时间，推荐 ISO8601（2025-11-14T12:00:00Z）或简单日期（2025-11-14）。用于排序、RSS、筛选。
updated / lastModified: 最新更新时间（可选）。
draft: 是否为草稿（boolean） — 构建脚本通常会过滤掉 draft: true 的文档。
分类与导航
tags: 标签数组（['astro','markdown']） — 用于标签页、过滤。
categories: 分类（string 或数组）。
series: 所属系列（string）。
SEO / 社交（可自定义）
canonical: 规范 URL。
robots: noindex / nofollow 等（字符串或数组）。
twitterCard / twitter:image / og:type 等也可自定义，或在 layout 中根据通用字段生成 meta 标签。
展示选项 / 行为
layout: 指定布局（字符串或组件引用，注意：在普通 .md 前端 YAML 里它只是元数据；是否生效取决于你的布局加载方式或构建脚本/集合规则）。
toc: 是否生成目录（boolean）或 toc: true。
readingTime: 也常作为构建时计算并写入的字段（通常不手动填写）。
hideTitle / showHero / noIndex 等自定义控制字段。
自定义任意字段
你可以放任意键（例如 math: true, coverColor: '#f5f5f5'），并在渲染或页面组件中使用它们。
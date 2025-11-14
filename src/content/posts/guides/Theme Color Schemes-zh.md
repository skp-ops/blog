---
title: 主题配色指南
published: 2025-04-11
tags:
  - 指南
toc: false
draft: true
lang: zh
abbrlink: theme-color-schemes
---

Retypeset 基于 [OKLCH](https://oklch.com/) 颜色空间来定义主题配色，默认为模拟印刷风格的黑白灰配色。

为满足个性化需求，我为主题制作了一些配色方案。你可以在 [src/config.ts](https://github.com/radishzzz/astro-theme-retypeset/blob/master/src/config.ts) 中替换默认配色，并**重启开发服务器**以预览新配色。

## 葱白

```
light: {
  primary: 'oklch(0.25 0.03 211.86)',
  secondary: 'oklch(0.40 0.03 211.86)',
  background: 'oklch(0.99 0.0039 106.47)',
  highlight: 'oklch(0.93 0.195089 103.2532 / 0.5)',
},
dark: {
  primary: 'oklch(0.92 0.0015 106.47)',
  secondary: 'oklch(0.79 0.0015 106.47)',
  background: 'oklch(0.24 0.0039 106.47)',
  highlight: 'oklch(0.93 0.195089 103.2532 / 0.2)',
},
```

## 鸦青


```
light: {
  primary: 'oklch(0.24 0.0172 280.05)',
  secondary: 'oklch(0.40 0.0172 280.05)',
  background: 'oklch(0.98 0.0172 280.05)',
  highlight: 'oklch(0.93 0.195089 103.2532 / 0.5)',
},
dark: {
  primary: 'oklch(0.92 0.0172 280.05)',
  secondary: 'oklch(0.79 0.0172 280.05)',
  background: 'oklch(0.24 0.0172 280.05)',
  highlight: 'oklch(0.93 0.195089 103.2532 / 0.2)',
},
```

## 墨蓝

```
light: {
  primary: 'oklch(0.24 0.06 230)',
  secondary: 'oklch(0.40 0.06 230)',
  background: 'oklch(0.99 0.005 230)',
  highlight: 'oklch(0.93 0.18 210 / 0.5)',
},
dark: {
  primary: 'oklch(0.92 0.02 230)',
  secondary: 'oklch(0.79 0.02 230)',
  background: 'oklch(0.24 0.02 230)',
  highlight: 'oklch(0.93 0.18 210 / 0.2)',
},
```

## 米黄

```
light: {
  primary: 'oklch(0.25 0 0)',
  secondary: 'oklch(0.41 0 0)',
  background: 'oklch(0.95 0.0237 59.39)',
  highlight: 'oklch(0.93 0.195089 103.2532 / 0.5)',
},
dark: {
  primary: 'oklch(0.93 0.019 59.39)',
  secondary: 'oklch(0.80 0.017 59.39)',
  background: 'oklch(0.23 0 0)',
  highlight: 'oklch(0.93 0.195089 103.2532 / 0.2)',
},
```

# Notion Blog Starter (Next.js + Notion CMS)

## 1. 项目概述

这是一个基于 **Next.js (Pages Router)** 的高性能静态博客生成器。它使用 **Notion** 作为无头 CMS，结合 **Tailwind CSS** 实现现代化 UI，支持 SEO 优化、暗黑模式及评论系统。

## 2. 技术栈

* **核心**: Next.js (TypeScript)
* **样式**: Tailwind CSS + `next-themes`
* **CMS**: Notion API (`notion-client`, `react-notion-x`)
* **评论**: Utterances (GitHub Issues)

## 3. Notion 数据库配置 (必须)

Notion Database 需包含以下属性才能被正确解析：

| 属性名 | 类型 | 说明 |
| --- | --- | --- |
| **Title** | Title | 文章标题 |
| **Slug** | Text | URL 路径标识 (唯一) |
| **Date** | Date | 发布日期 |
| **Tags** | Multi-select | 文章标签 |
| **Summary** | Text | 列表页摘要 |
| **Thumbnail** | Files & media | 封面图 (列表页展示) |
| **Status** | Select | 必须为 `Published` 才展示 |
| **Type** | Select | 必须为 `Post` 才展示 |

## 4. 核心开发规范

### 数据与渲染 (`lib/notion.ts`)

* **图片代理**: 自动将 Notion S3 (`amazonaws.com`) 链接转换为 Notion Public Proxy (`notion.so/image/...`)，解决链接过期与权限问题。
* **性能优化**: 详情页重型组件（Code, Equation, Pdf 等）采用 `next/dynamic` 动态导入。

### UI/UX 策略

* **响应式布局**:
* **PC**: 左侧标签导航 | 中间内容 | 右侧个人简介。
* **Mobile**: 单栏流式。**特殊处理**: 使用 Tailwind `order` 属性将个人简介 (Profile) 置顶。

* **视觉风格**:
* 支持日间/夜间模式 (使用 `dark:` 前缀)。
* 列表页无封面图时自动收缩卡片高度。

### 评论系统

* **Utterances 集成**: 组件内使用 `<div>` 包裹 `<script>`，防止 React 卸载时触发 `NoModificationAllowedError`。

## 6. 配置指南

所有可配置项位于根目录 `site.config.js`：

1. **Notion Page ID**: 博客源 Database 的 ID。
2. **Profile**: 个人信息与社交链接。
3. **Utterances**: 配置 GitHub 仓库与 Issue 映射方式。

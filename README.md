# Notion Blog Starter

这是一个基于 Next.js 和 Notion API 的静态博客生成器。它可以直接读取你的 Notion 数据库作为内容源，并生成一个高性能的静态博客网站。

风格和功能参考了 [morethan-log](https://github.com/morethanmin/morethan-log)。

## 特性

- 🚀 **基于 Next.js**: 快速、SEO 友好。
- 📝 **Notion 作为 CMS**: 在 Notion 中写作，自动发布到博客。
- 🎨 **Tailwind CSS**: 易于定制的样式。
- ⚡ **Vercel 部署**: 一键部署，无需服务器。

## 准备工作

### 1. 准备 Notion 页面

你需要创建一个 Notion 页面作为博客的数据库。

1.  在 Notion 中创建一个新的 **Database** (Full page)。
2.  设置以下属性（属性名必须严格一致，区分大小写）：
    *   **Title** (标题): 文章标题
    *   **Slug** (Text): 文章的 URL 路径 (例如: `my-first-post`)
    *   **Date** (Date): 发布日期
    *   **Tags** (Multi-select): 标签
    *   **Summary** (Text): 文章摘要
    *   **Type** (Select): 类型，必须包含 `Post` 选项
    *   **Status** (Select): 状态，必须包含 `Published` 选项
3.  创建一篇文章，并确保 `Type` 为 `Post`，`Status` 为 `Published`。
4.  点击右上角的 "Share"，开启 "Share to web"。
5.  复制链接，提取 Page ID。
    *   链接格式通常为: `https://www.notion.so/username/Page-Title-1234567890abcdef1234567890abcdef`
    *   **Page ID** 为: `1234567890abcdef1234567890abcdef`

## 部署步骤

### 方法 A: 使用 Vercel CLI (推荐开发者)

1.  进入项目目录:
    ```bash
    cd notion-blog-starter
    ```
2.  安装依赖:
    ```bash
    npm install
    ```
3.  本地运行测试:
    *   修改 `site.config.js` 中的 `notionConfig.pageId` 为你的 Page ID。
    *   运行 `npm run dev`。
    *   访问 `http://localhost:3000`。
4.  部署:
    ```bash
    vercel
    ```

### 方法 B: 连接 GitHub 部署到 Vercel

1.  将此代码库上传到你的 GitHub。
2.  登录 [Vercel](https://vercel.com)。
3.  点击 "Add New..." -> "Project"。
4.  选择你的 GitHub 仓库并 Import。
5.  在 "Environment Variables" 中添加环境变量:
    *   Name: `NOTION_PAGE_ID`
    *   Value: 你的 Notion Page ID (例如 `1234567890abcdef1234567890abcdef`)
6.  点击 "Deploy"。

## 配置

主要配置文件位于 `site.config.js`。你可以修改：
*   博客标题、描述
*   个人信息（包括头像、角色、简介）
*   社交链接
*   Notion Page ID (如果未使用环境变量)


## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 许可证

MIT

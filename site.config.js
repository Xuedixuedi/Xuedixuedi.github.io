const { siteUrl } = require("./src/lib/site-url");

const CONFIG = {
  // 博客的基本信息
  profile: {
    name: "Xuedi's Blog",
    image: "/avatar.png", // 如果你有头像，放在 public 目录下
    role: "Mobile developer",
    bio: "I develop everything.",
    linkedin: "xuedi-liu-1b37211b9",
    email: "liuxuedi1129@gmail.com",
    github: "xuedixuedi",
    instagram: "",
    unsplash: "liuxuedi",
  },
  projects: [
    {
      name: `Xuedi's Blog`,
      href: "https://github.com/xuedixuedi/xuedi-blog",
    },
  ],
  // 博客的配置
  blog: {
    title: "Xuedi's Blog",
    description: "welcome to Xuedi's Blog!",
    theme: "auto", // ['light', 'dark', 'auto']
  },

  // CONFIG configration (required)
  link: siteUrl(),
  since: 2023, // If leave this empty, current year will be used.
  lang: "zh-CN", // ['en-US', 'zh-CN', 'zh-HK', 'zh-TW', 'ja-JP', 'es-ES', 'ko-KR']
  ogImageGenerateURL: "https://og-image-korean.vercel.app", // The link to generate OG image, don't end with a slash

  // Notion 配置 (REQUIRED)
  notionConfig: {
    // 这里填入你的 Notion Page ID
    // 你需要复制你的 Notion 页面的链接，例如：
    // https://www.notion.so/morethanmin/morethan-log-1234567890abcdef1234567890abcdef
    // 其中的 pageId 就是 1234567890abcdef1234567890abcdef
    pageId: process.env.NOTION_PAGE_ID || "",
  },

  // Google Analytics 配置
  googleAnalytics: {
    enable: false,
    config: {
      measurementId: process.env.NEXT_PUBLIC_GOOGLE_MEASUREMENT_ID || "",
    },
  },
  googleSearchConsole: {
    enable: false,
    config: {
      siteVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
    },
  },
  utterances: {
    enable: true,
    config: {
      repo: "xuedixuedi/Xuedixuedi.github.io",
      "issue-term": "og:title",
      label: "💬 Utterances",
    },
  },
  isProd: process.env.VERCEL_ENV === "production", // distinguish between development and production environment (ref: https://vercel.com/docs/environment-variables#system-environment-variables)
};

module.exports = { CONFIG };

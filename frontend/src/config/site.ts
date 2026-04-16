// Site-wide configuration - centralized hardcoded values

export const siteConfig = {
  // Basic info
  name: "Chuyi的博客",
  url: 'https://blog.chuyi.uk',
  description: '欢迎来到Chuyi的个人博客，分享技术文章、生活感悟和创意思考。',
  language: 'zh-cn',
  copyright: (year: number) => `Copyright ${year} Chuyi. All rights reserved.`,

  // Author info
  author: {
    name: 'chuyi',
    displayName: 'Chuyi',
    email: 'admin@chuyi.uk',
    role: 'Full Stack Developer & UI/UX Designer',
  },

  // Social links
  social: {
    github: 'https://github.com/xirichuyi',
    linkedin: 'https://www.linkedin.com/in/%E5%88%9D%E4%B8%80-%E6%98%94%E6%97%A5-223012366/',
    telegram: 'https://t.me/xrcy97',
    linuxdo: 'https://linux.do/u/xrcy97',
  },
} as const;

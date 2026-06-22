// 分页配置
export const PAGE_SIZE = {
  DESKTOP: 12,
  MOBILE: 10,
  HOME: 7,
};

// 断点配置
export const BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1024,
};

// 文章卡片渐变色数组
export const ARTICLE_GRADIENTS = [
  "linear-gradient(135deg, #E1BEE7 0%, #F8BBD9 100%)",
  "linear-gradient(135deg, #B8C5D1 0%, #D6E3F0 100%)",
  "linear-gradient(135deg, #E8F5E8 0%, #C8E6C9 100%)",
  "linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)",
  "linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)",
  "linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)",
  "linear-gradient(135deg, #FCE4EC 0%, #F8BBD9 100%)",
];

// 根据索引获取渐变色
export const getGradientForIndex = (index: number): string => {
  return ARTICLE_GRADIENTS[index % ARTICLE_GRADIENTS.length];
};

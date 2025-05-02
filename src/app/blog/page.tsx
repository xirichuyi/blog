import BlogClient from "./BlogClient";

export const metadata = {
  title: "Blog | Cyrus",
  description: "Read the latest articles and insights from Cyrus",
};

export default function Blog() {
  // This would typically come from a CMS or markdown files
  const blogPosts = [
    {
      id: 1,
      title: "Business Strategy in the Digital Age",
      excerpt: "Exploring how digital transformation is reshaping business strategies across industries.",
      date: "May 2, 2024",
      slug: "business-strategy-digital-age",
      categories: ["Strategy", "Digital Transformation"],
    },
    {
      id: 2,
      title: "Leadership Principles for Modern Teams",
      excerpt: "Key leadership principles that drive success in today&apos;s fast-paced business environment.",
      date: "April 28, 2024",
      slug: "leadership-principles-modern-teams",
      categories: ["Leadership", "Team Management"],
    },
    {
      id: 3,
      title: "The Future of Work: Trends and Predictions",
      excerpt: "Analyzing emerging workplace trends and what they mean for businesses and professionals.",
      date: "April 15, 2024",
      slug: "future-work-trends-predictions",
      categories: ["Future of Work", "Workplace Trends"],
    },
    {
      id: 4,
      title: "Effective Communication in Remote Teams",
      excerpt: "Strategies for maintaining clear and effective communication in distributed teams.",
      date: "April 5, 2024",
      slug: "effective-communication-remote-teams",
      categories: ["Communication", "Remote Work"],
    },
    {
      id: 5,
      title: "Data-Driven Decision Making",
      excerpt: "How to leverage data analytics to make more informed business decisions.",
      date: "March 22, 2024",
      slug: "data-driven-decision-making",
      categories: ["Data Analytics", "Decision Making"],
    },
    {
      id: 6,
      title: "Building a Strong Company Culture",
      excerpt: "The importance of company culture and how to cultivate it effectively.",
      date: "March 10, 2024",
      slug: "building-strong-company-culture",
      categories: ["Company Culture", "Leadership"],
    },
  ];

  // 使用客户端组件渲染UI
  return <BlogClient blogPosts={blogPosts} />;
}

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import PageTransition from "../../../components/PageTransition";
import { notFound } from "next/navigation";

// This would typically come from a CMS or markdown files
const blogPosts = [
  {
    id: 1,
    title: "Business Strategy in the Digital Age",
    excerpt: "Exploring how digital transformation is reshaping business strategies across industries.",
    date: "May 2, 2024",
    slug: "business-strategy-digital-age",
    content: `
      <p>In today's rapidly evolving business landscape, digital transformation has become a critical driver of strategic change. Organizations across industries are reimagining their business models, operational processes, and customer experiences through the lens of digital technologies.</p>

      <h2>The Imperative for Digital Transformation</h2>
      <p>Digital transformation is no longer optional for businesses seeking to remain competitive. The convergence of technologies such as artificial intelligence, cloud computing, big data analytics, and the Internet of Things has created unprecedented opportunities for innovation and disruption.</p>

      <p>Companies that successfully navigate digital transformation can achieve significant benefits:</p>
      <ul>
        <li>Enhanced customer experiences and engagement</li>
        <li>Streamlined operations and increased efficiency</li>
        <li>Data-driven decision making capabilities</li>
        <li>New revenue streams and business models</li>
        <li>Improved agility and responsiveness to market changes</li>
      </ul>

      <h2>Key Components of a Digital Strategy</h2>
      <p>A comprehensive digital strategy should address several key components:</p>

      <h3>1. Customer Experience Transformation</h3>
      <p>Digital technologies enable organizations to deliver personalized, seamless experiences across all customer touchpoints. By leveraging data analytics and customer insights, companies can create more meaningful interactions that drive loyalty and growth.</p>

      <h3>2. Operational Excellence</h3>
      <p>Digital tools and automation can significantly improve operational efficiency. From robotic process automation to AI-powered workflows, organizations can reduce costs, minimize errors, and free up human resources for higher-value activities.</p>

      <h3>3. Business Model Innovation</h3>
      <p>Digital transformation often leads to entirely new business models. Subscription services, platform-based ecosystems, and data monetization represent just a few ways companies are creating value in the digital economy.</p>

      <h3>4. Data Strategy</h3>
      <p>Data has become a critical strategic asset. Organizations need a clear strategy for collecting, managing, analyzing, and deriving insights from their data to inform decision-making and create competitive advantage.</p>

      <h2>Challenges in Digital Transformation</h2>
      <p>Despite the clear benefits, digital transformation initiatives face significant challenges:</p>

      <p><strong>Cultural Resistance:</strong> Perhaps the most significant barrier to digital transformation is organizational culture. Resistance to change, siloed thinking, and fear of disruption can impede progress.</p>

      <p><strong>Legacy Systems:</strong> Many established organizations struggle with outdated technology infrastructure that is difficult and expensive to replace.</p>

      <p><strong>Talent Gaps:</strong> The demand for digital skills far outpaces supply, making it challenging for organizations to build the capabilities needed for transformation.</p>

      <p><strong>Cybersecurity Concerns:</strong> As organizations become more digital, they also become more vulnerable to cyber threats, requiring robust security measures.</p>

      <h2>The Path Forward</h2>
      <p>Successful digital transformation requires a holistic approach that addresses technology, people, and processes. Organizations should:</p>

      <p><strong>Start with a clear vision:</strong> Define what digital transformation means for your organization and how it aligns with your overall business strategy.</p>

      <p><strong>Focus on people:</strong> Invest in change management, training, and building a digital culture that embraces innovation and continuous learning.</p>

      <p><strong>Take an iterative approach:</strong> Rather than attempting a massive overhaul, focus on quick wins that demonstrate value and build momentum.</p>

      <p><strong>Measure and adapt:</strong> Establish clear metrics for success and be willing to pivot based on results and changing market conditions.</p>

      <h2>Conclusion</h2>
      <p>Digital transformation represents both a significant challenge and an unprecedented opportunity for businesses. Those that can effectively harness digital technologies to reimagine their strategies, operations, and customer experiences will be well-positioned to thrive in an increasingly digital future.</p>
    `,
  },
  {
    id: 2,
    title: "Leadership Principles for Modern Teams",
    excerpt: "Key leadership principles that drive success in today's fast-paced business environment.",
    date: "April 28, 2024",
    slug: "leadership-principles-modern-teams",
    content: `
      <p>Effective leadership has never been more critical or more challenging than in today's rapidly evolving business landscape. Modern teams require a different approach to leadership—one that emphasizes adaptability, emotional intelligence, and collaborative decision-making.</p>

      <h2>The Changing Nature of Leadership</h2>
      <p>Traditional command-and-control leadership models are increasingly ineffective in modern organizations. Several factors have contributed to this shift:</p>

      <ul>
        <li>The rise of knowledge work, where success depends on creativity and innovation rather than standardized processes</li>
        <li>Increasingly diverse and distributed teams spanning different geographies, cultures, and generations</li>
        <li>Rapid technological change that requires continuous learning and adaptation</li>
        <li>Evolving employee expectations around purpose, autonomy, and work-life integration</li>
      </ul>

      <h2>Core Principles for Modern Leadership</h2>

      <h3>1. Lead with Purpose and Vision</h3>
      <p>Modern leaders must articulate a compelling vision that connects daily work to a larger purpose. When team members understand the "why" behind their efforts, they're more engaged, motivated, and resilient in the face of challenges.</p>

      <p>Effective purpose-driven leaders:</p>
      <ul>
        <li>Clearly communicate how the team's work contributes to organizational goals and broader impact</li>
        <li>Make decisions that consistently align with stated values and purpose</li>
        <li>Help team members see the connection between their individual contributions and the bigger picture</li>
      </ul>

      <h3>2. Embrace Psychological Safety</h3>
      <p>Google's Project Aristotle research identified psychological safety—the belief that one won't be punished or humiliated for speaking up with ideas, questions, concerns, or mistakes—as the most important factor in high-performing teams.</p>

      <p>Leaders can foster psychological safety by:</p>
      <ul>
        <li>Modeling vulnerability and admitting their own mistakes</li>
        <li>Actively soliciting diverse perspectives and dissenting opinions</li>
        <li>Responding constructively to failures and viewing them as learning opportunities</li>
        <li>Giving credit generously and taking responsibility for team shortcomings</li>
      </ul>

      <h3>3. Develop Emotional Intelligence</h3>
      <p>Emotional intelligence—the ability to recognize, understand, and manage emotions in oneself and others—is a critical leadership skill. Emotionally intelligent leaders build stronger relationships, navigate conflict more effectively, and create more positive team dynamics.</p>

      <p>Key aspects of emotional intelligence include:</p>
      <ul>
        <li>Self-awareness: Understanding your own emotions, strengths, weaknesses, and impact on others</li>
        <li>Self-regulation: Managing disruptive emotions and adapting to changing circumstances</li>
        <li>Empathy: Sensing others' emotions and understanding their perspectives</li>
        <li>Social skills: Building rapport, influencing others, and managing relationships effectively</li>
      </ul>

      <h3>4. Empower and Delegate</h3>
      <p>Modern leaders recognize that their primary role is to enable others to do their best work. This means providing clear direction and context, then giving team members the autonomy to determine how to achieve objectives.</p>

      <p>Effective delegation involves:</p>
      <ul>
        <li>Matching assignments to individuals' strengths and development goals</li>
        <li>Clearly communicating expectations, constraints, and available resources</li>
        <li>Providing appropriate support without micromanaging</li>
        <li>Establishing feedback loops to monitor progress and provide guidance</li>
      </ul>

      <h3>5. Foster Continuous Learning</h3>
      <p>In a rapidly changing business environment, the ability to learn and adapt is crucial for sustained success. Leaders must create a culture of continuous learning where curiosity is encouraged and growth is prioritized.</p>

      <p>Strategies for fostering a learning culture include:</p>
      <ul>
        <li>Dedicating time and resources for learning and experimentation</li>
        <li>Encouraging cross-functional collaboration and knowledge sharing</li>
        <li>Providing regular, constructive feedback focused on growth</li>
        <li>Celebrating learning and improvement, not just outcomes</li>
      </ul>

      <h2>Implementing Modern Leadership Principles</h2>
      <p>Transitioning to a more modern leadership approach requires intentional effort and practice. Here are some practical steps for implementing these principles:</p>

      <p><strong>Start with self-reflection:</strong> Assess your current leadership style and identify areas for growth. Seek feedback from team members, peers, and mentors.</p>

      <p><strong>Invest in relationships:</strong> Make time for one-on-one conversations with team members to understand their motivations, strengths, and challenges.</p>

      <p><strong>Practice inclusive decision-making:</strong> Involve team members in decisions that affect their work, and be transparent about the rationale behind decisions made at higher levels.</p>

      <p><strong>Model continuous learning:</strong> Share your own learning journey, including mistakes and insights, and create opportunities for the team to learn together.</p>

      <h2>Conclusion</h2>
      <p>Modern leadership is less about having all the answers and more about asking the right questions, creating the conditions for others to succeed, and building adaptive teams that can thrive amid uncertainty. By embracing these principles, leaders can build more engaged, innovative, and resilient teams capable of navigating the challenges of today's business environment.</p>
    `,
  },
  {
    id: 3,
    title: "The Future of Work: Trends and Predictions",
    excerpt: "Analyzing emerging workplace trends and what they mean for businesses and professionals.",
    date: "April 15, 2024",
    slug: "future-work-trends-predictions",
    content: `
      <p>The world of work is undergoing a profound transformation, accelerated by technological advances, changing demographics, and evolving employee expectations. Understanding these shifts is crucial for organizations and professionals seeking to thrive in the future workplace.</p>

      <h2>Key Trends Shaping the Future of Work</h2>

      <h3>1. Hybrid Work Models Become the Norm</h3>
      <p>The pandemic-induced shift to remote work has evolved into more nuanced hybrid arrangements that combine in-person and remote work. Organizations are reimagining their physical workspaces as collaboration hubs while supporting distributed work through digital tools and flexible policies.</p>

      <p>Implications:</p>
      <ul>
        <li>Office designs are evolving to prioritize collaboration spaces over individual workstations</li>
        <li>Organizations need robust digital infrastructure to support seamless work across locations</li>
        <li>Management practices must adapt to focus on outcomes rather than presence</li>
        <li>Company culture requires intentional nurturing in hybrid environments</li>
      </ul>

      <h3>2. AI and Automation Transform Job Roles</h3>
      <p>Artificial intelligence, machine learning, and automation are reshaping job roles across industries. While routine tasks are increasingly automated, new roles are emerging that focus on uniquely human capabilities like creativity, emotional intelligence, and complex problem-solving.</p>

      <p>Implications:</p>
      <ul>
        <li>Workers need to develop skills that complement rather than compete with AI</li>
        <li>Organizations must invest in reskilling and upskilling programs</li>
        <li>Job design should focus on augmenting human capabilities with technology</li>
        <li>Ethical considerations around AI deployment become increasingly important</li>
      </ul>

      <h3>3. The Rise of the Skills-Based Organization</h3>
      <p>Traditional job descriptions and career paths are giving way to more fluid, skills-based approaches to work. Organizations are focusing less on formal credentials and more on specific capabilities, creating internal talent marketplaces that match skills to projects and opportunities.</p>

      <p>Implications:</p>
      <ul>
        <li>Skills inventories and talent marketplaces become critical HR infrastructure</li>
        <li>Career development shifts from vertical ladders to multidirectional pathways</li>
        <li>Continuous learning becomes essential for long-term employability</li>
        <li>Organizations need new approaches to compensation and advancement</li>
      </ul>

      <h3>4. Workforce Diversity Expands in Multiple Dimensions</h3>
      <p>The workforce is becoming more diverse across multiple dimensions, including age, ethnicity, gender, neurodiversity, and work arrangements (full-time, part-time, contract, gig). Organizations that effectively harness this diversity gain access to broader perspectives and talent pools.</p>

      <p>Implications:</p>
      <ul>
        <li>Inclusive leadership practices become business imperatives</li>
        <li>Organizations need flexible policies that accommodate diverse needs and preferences</li>
        <li>Collaboration across differences requires intentional facilitation</li>
        <li>Equity in opportunity and advancement requires systematic attention</li>
      </ul>

      <h3>5. Employee Wellbeing Takes Center Stage</h3>
      <p>Organizations are recognizing that employee wellbeing—physical, mental, financial, and social—directly impacts business performance. Holistic wellbeing programs are becoming competitive advantages in attracting and retaining talent.</p>

      <p>Implications:</p>
      <ul>
        <li>Work design must consider sustainable performance, not just short-term productivity</li>
        <li>Managers need training to support team wellbeing and recognize warning signs</li>
        <li>Benefits programs are expanding to address diverse wellbeing needs</li>
        <li>Organizational culture must genuinely value and protect employee wellbeing</li>
      </ul>

      <h2>Preparing for the Future of Work</h2>

      <h3>Recommendations for Organizations</h3>

      <p><strong>Develop strategic workforce planning capabilities:</strong> Regularly assess how emerging trends will affect your talent needs and develop proactive strategies to address gaps.</p>

      <p><strong>Invest in learning ecosystems:</strong> Create comprehensive learning environments that combine formal training, on-the-job development, peer learning, and external resources.</p>

      <p><strong>Redesign work for flexibility and wellbeing:</strong> Examine how, when, and where work happens to maximize both performance and sustainability.</p>

      <p><strong>Build inclusive leadership capabilities:</strong> Ensure leaders at all levels can effectively engage diverse teams and create environments where everyone can contribute fully.</p>

      <p><strong>Embrace experimentation:</strong> Test new approaches to work through pilots and controlled experiments, gathering data to inform broader implementation.</p>

      <h3>Recommendations for Individuals</h3>

      <p><strong>Adopt a learning mindset:</strong> Commit to continuous skill development, focusing on both technical capabilities and human skills like adaptability, communication, and collaboration.</p>

      <p><strong>Build a diverse network:</strong> Cultivate relationships across different industries, functions, and backgrounds to expand your perspectives and opportunities.</p>

      <p><strong>Develop digital fluency:</strong> Understand how technology is changing your field and build capabilities to work effectively with digital tools and AI.</p>

      <p><strong>Clarify your value proposition:</strong> Identify the unique combination of skills, experiences, and perspectives you offer and how they create value in changing contexts.</p>

      <p><strong>Practice self-management:</strong> Develop routines and boundaries that support your productivity, wellbeing, and continued growth in more autonomous work environments.</p>

      <h2>Conclusion</h2>
      <p>The future of work offers both challenges and opportunities for organizations and individuals. By understanding key trends and taking proactive steps to adapt, we can shape workplaces that are more productive, inclusive, and fulfilling. The most successful organizations and professionals will be those who view these changes not as threats to be resisted but as opportunities to create better ways of working.</p>
    `,
  },
];

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = blogPosts.find((post) => post.slug === params.slug);

  if (!post) {
    return {
      title: "Post Not Found | Cyrus",
      description: "The requested blog post could not be found.",
    };
  }

  return {
    title: `${post.title} | Cyrus`,
    description: post.excerpt,
  };
}

export default function BlogPost({ params }: { params: { slug: string } }) {
  const post = blogPosts.find((post) => post.slug === params.slug);

  if (!post) {
    notFound();
  }

  return (
    <PageTransition>
      <article className="container-apple py-16 md:py-24">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/blog"
            className="inline-flex items-center text-apple-gray-600 dark:text-apple-gray-300 hover:text-primary mb-8"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Blog
          </Link>

          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mb-12"
          >
            <p className="text-primary font-medium mb-4">{post.date}</p>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">{post.title}</h1>
            <p className="text-xl text-apple-gray-600 dark:text-apple-gray-300">{post.excerpt}</p>
          </motion.header>

          <motion.div
            className="prose prose-lg dark:prose-invert max-w-none"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-16 pt-8 border-t border-apple-gray-200 dark:border-apple-gray-700"
          >
            <h2 className="text-2xl font-bold mb-6">Share this article</h2>
            <div className="flex gap-4">
              <a href="#" className="btn-apple btn-apple-secondary px-6">
                Twitter
              </a>
              <a href="#" className="btn-apple btn-apple-secondary px-6">
                LinkedIn
              </a>
              <a href="#" className="btn-apple btn-apple-secondary px-6">
                Facebook
              </a>
            </div>
          </motion.div>
        </div>
      </article>
    </PageTransition>
  );
}

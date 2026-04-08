import { useState, useEffect } from 'react';
import Giscus from '@giscus/react';

interface CommentsProps {
  term: string;
}

const Comments: React.FC<CommentsProps> = ({ term }) => {
  const [theme, setTheme] = useState(() =>
    document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
  );

  // Watch for theme changes via MutationObserver
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      setTheme(prev => prev === current ? prev : current);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ marginTop: '3rem' }}>
      <Giscus
        id="comments"
        repo="xirichuyi/blog"
        repoId="R_kgDOOja-Zg"
        category="General"
        categoryId="DIC_kwDOOja-Zs4C6WMR"
        mapping="specific"
        term={term}
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="top"
        theme={theme}
        lang="zh-CN"
        loading="lazy"
      />
    </div>
  );
};

export default Comments;

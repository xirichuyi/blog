import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import type { Article } from '../../services/types';
import { logger } from '../../utils/logger';
import './Archives.css';

interface YearGroup {
  year: string;
  months: MonthGroup[];
  count: number;
}

interface MonthGroup {
  month: string;
  monthLabel: string;
  articles: Article[];
}

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function groupByYearMonth(articles: Article[]): YearGroup[] {
  const map = new Map<string, Map<string, Article[]>>();

  const sorted = [...articles].sort((a, b) =>
    new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
  );

  for (const article of sorted) {
    const date = new Date(article.publishDate);
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');

    if (!map.has(year)) map.set(year, new Map());
    const yearMap = map.get(year)!;
    if (!yearMap.has(month)) yearMap.set(month, []);
    yearMap.get(month)!.push(article);
  }

  const sortedYears = [...map.keys()].sort((a, b) => Number(b) - Number(a));
  return sortedYears.map(year => {
    const monthMap = map.get(year)!;
    const sortedMonths = [...monthMap.keys()].sort((a, b) => Number(b) - Number(a));
    const months: MonthGroup[] = sortedMonths.map(month => ({
      month,
      monthLabel: MONTH_LABELS[Number(month) - 1],
      articles: monthMap.get(month)!,
    }));
    const count = months.reduce((sum, m) => sum + m.articles.length, 0);
    return { year, months, count };
  });
}

function formatArchiveDate(dateString: string): string {
  const date = new Date(dateString);
  return `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

const Archives: React.FC = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadArticles = async () => {
      setIsLoading(true);
      try {
        const response = await apiService.getArticles({
          status: 'published',
          page_size: 500,
        });
        if (response.success && response.data) {
          setArticles(response.data);
        }
      } catch (err) {
        logger.error('Failed to load articles for archives:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadArticles();
  }, []);

  const yearGroups = useMemo(() => groupByYearMonth(articles), [articles]);
  const totalCount = articles.length;

  if (isLoading) {
    return (
      <div className="archives-page">
        <div className="archives-loading">
          <md-circular-progress indeterminate></md-circular-progress>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="archives-page">
      <header className="archives-header">
        <h1>Archives</h1>
        <p className="archives-subtitle">
          {totalCount} articles in total
        </p>
      </header>

      <div className="archives-timeline">
        {yearGroups.map((yearGroup) => (
          <section key={yearGroup.year} className="archives-year-section">
            <div className="year-header">
              <h2 className="year-title">{yearGroup.year}</h2>
              <span className="year-count">{yearGroup.count} posts</span>
            </div>

            {yearGroup.months.map((monthGroup) => (
              <div key={monthGroup.month} className="archives-month-section">
                <h3 className="month-title">{monthGroup.monthLabel}</h3>

                <ul className="archives-list">
                  {monthGroup.articles.map((article) => (
                    <li
                      key={article.id}
                      className="archives-item"
                      onClick={() => navigate(`/article/${article.id}`)}
                    >
                      <span className="item-date">{formatArchiveDate(article.publishDate)}</span>
                      <span className="item-dot"></span>
                      <div className="item-content">
                        <span className="item-title">{article.title}</span>
                        {article.category && (
                          <span className="item-category">{article.category}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}

        {yearGroups.length === 0 && (
          <div className="archives-empty">
            <md-icon>inventory_2</md-icon>
            <p>No articles yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Archives;

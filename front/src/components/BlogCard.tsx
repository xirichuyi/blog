import { useNavigate } from 'react-router-dom'
import { Calendar } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Article } from '@/services/api'

const GRADIENTS = [
  'linear-gradient(135deg, #E1BEE7 0%, #F8BBD9 100%)',
  'linear-gradient(135deg, #B8C5D1 0%, #D6E3F0 100%)',
  'linear-gradient(135deg, #E8F5E8 0%, #C8E6C9 100%)',
  'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)',
  'linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)',
  'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)',
  'linear-gradient(135deg, #FCE4EC 0%, #F8BBD9 100%)',
]

export function BlogCard({ article, index = 0, featured = false }: { article: Article; index?: number; featured?: boolean }) {
  const navigate = useNavigate()
  const gradient = GRADIENTS[index % GRADIENTS.length]

  return (
    <Card
      onClick={() => navigate(`/article/${article.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          navigate(`/article/${article.id}`)
        }
      }}
      className="group flex cursor-pointer flex-col overflow-hidden p-0 transition-all duration-200 hover:-translate-y-1 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div
        className={cn('w-full overflow-hidden', featured ? 'aspect-[2/1]' : 'aspect-[16/10]')}
        style={{ background: gradient }}
      >
        {article.coverImage && (
          <img
            src={article.coverImage}
            alt={article.title}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
      </div>
      <CardHeader className="gap-2 p-5">
        <Badge variant="secondary" className="w-fit">
          {article.category}
        </Badge>
        <CardTitle className={cn('line-clamp-2 transition-colors group-hover:text-primary', featured ? 'text-2xl' : 'text-lg')}>
          {article.title}
        </CardTitle>
        <CardDescription className="line-clamp-2">{article.excerpt}</CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto gap-2 px-5 pb-5 text-xs text-muted-foreground">
        <Calendar className="size-3.5" />
        <span>{article.date}</span>
      </CardFooter>
    </Card>
  )
}

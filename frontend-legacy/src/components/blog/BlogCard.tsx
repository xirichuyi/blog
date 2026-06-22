import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/shadcn/card'
import { Badge } from '@/components/ui/shadcn/badge'
import { cn } from '@/lib/utils'
import { Calendar } from 'lucide-react'

export interface BlogCardProps {
  id: string
  title: string
  description: string
  date: string
  tag: string
  coverImage?: string | null
  gradient?: string
  featured?: boolean
  onClick: (id: string) => void
}

/** shadcn-styled article card, shared by Home and Articles. */
export function BlogCard({
  id,
  title,
  description,
  date,
  tag,
  coverImage,
  gradient,
  featured = false,
  onClick,
}: BlogCardProps) {
  return (
    <Card
      onClick={() => onClick(id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(id)
        }
      }}
      className="group flex cursor-pointer flex-col overflow-hidden p-0 transition-all duration-200 hover:-translate-y-1 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div
        className={cn('w-full overflow-hidden', featured ? 'aspect-[2/1]' : 'aspect-[16/10]')}
        style={{ background: gradient }}
      >
        {coverImage && (
          <img
            src={coverImage}
            alt={title}
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
          {tag}
        </Badge>
        <CardTitle
          className={cn(
            'line-clamp-2 transition-colors group-hover:text-primary',
            featured ? 'text-2xl' : 'text-lg'
          )}
        >
          {title}
        </CardTitle>
        <CardDescription className="line-clamp-2">{description}</CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto gap-2 px-5 pb-5 text-xs text-muted-foreground">
        <Calendar className="size-3.5" />
        <span>{date}</span>
      </CardFooter>
    </Card>
  )
}

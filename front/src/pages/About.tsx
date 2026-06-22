import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Loader2 } from 'lucide-react'
import { getAbout, type About as AboutData } from '@/services/api'
import { Markdown } from '@/components/Markdown'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export default function About() {
  const [data, setData] = useState<AboutData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAbout()
      .then(setData)
      .catch((e) => setError(String(e)))
  }, [])

  if (error) {
    return <div className="container py-24 text-center text-sm text-destructive">加载失败：{error}</div>
  }
  if (!data) {
    return (
      <div className="container flex items-center justify-center gap-2 py-24 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> 加载中…
      </div>
    )
  }

  return (
    <div className="container max-w-3xl py-16">
      <Helmet>
        <title>About · chuyi's blog</title>
      </Helmet>

      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <Avatar className="size-20 border border-border">
          {data.photoUrl && <AvatarImage src={data.photoUrl} alt={data.title} />}
          <AvatarFallback className="text-2xl">{data.title?.[0] ?? 'C'}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{data.title}</h1>
          <p className="mt-2 text-lg text-muted-foreground">{data.subtitle}</p>
        </div>
      </div>

      {data.content && (
        <div className="mt-10">
          <Markdown content={data.content} />
        </div>
      )}
    </div>
  )
}

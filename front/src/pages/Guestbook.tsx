import { GiscusComments } from '@/components/GiscusComments'
import { SEO } from '@/components/SEO'

export default function Guestbook() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 sm:py-20">
      <SEO
        title="Guestbook"
        description="Leave a note, suggestion, question, or link for chuyi."
        path="/guestbook"
      />
      <header className="mb-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Community</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Guestbook</h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
          Leave a thought, suggestion, question, or link. Powered by GitHub Discussions.
        </p>
      </header>
      <GiscusComments
        term="guestbook"
        title="Leave a note"
        description="Sign in with GitHub to post a message or react to other notes."
      />
    </div>
  )
}

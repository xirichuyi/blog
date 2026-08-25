import { GiscusComments } from '@/components/GiscusComments'
import { SEO } from '@/components/SEO'

export default function Guestbook() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
      <SEO
        title="留言簿"
        description="留下一句话、一个想法，或一次路过的痕迹。"
        path="/guestbook"
      />
      <header className="public-page-head">
        <p className="literary-kicker">GUESTBOOK · 来信</p>
        <h1>留一行字</h1>
        <p>若你恰好路过，欢迎留下一个想法、一句问候，或最近读到的好东西。</p>
      </header>
      <GiscusComments
        term="guestbook"
        title="写下留言"
        description="使用 GitHub 登录后，可以留言或回应其他人的文字。"
      />
    </div>
  )
}

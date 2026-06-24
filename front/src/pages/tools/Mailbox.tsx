import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail } from 'lucide-react'
import MailReader from '@/components/MailReader'

// 邮箱阅读单独成页（/tools/mailbox），在「在线工具」列表里以内链入口出现，
// 不再把表单裸露在 Projects 页上 —— 与 GitBook→EPUB 等工具保持一致。
export default function Mailbox() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 sm:px-8">
      <Helmet>
        <title>邮箱阅读 · IMAP · chuyi's blog</title>
      </Helmet>

      <Link
        to="/projects"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Projects
      </Link>

      <header className="mb-8">
        <div className="mb-3 inline-flex size-11 items-center justify-center rounded-xl bg-secondary text-foreground">
          <Mail className="size-5" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">邮箱阅读 · IMAP</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          填入邮箱和 IMAP 授权码，直接在浏览器里读最近的邮件。支持 Yahoo / Gmail / Outlook /
          iCloud / QQ / 163 等常见邮箱。授权码只用于本次读取，前端不保存、服务端不落库；用完即丢。
        </p>
      </header>

      <MailReader />

      <div className="mt-12 space-y-2 border-t border-border/60 pt-6 text-xs leading-relaxed text-muted-foreground">
        <p>
          <span className="font-medium text-foreground/80">说明.</span>{' '}
          浏览器无法直接连 IMAP，由后端临时中转一次，不存储任何凭据或邮件内容。
        </p>
        <p>请使用各邮箱「设置 → IMAP / 授权码」里生成的应用专用密码，而非登录密码。</p>
      </div>
    </div>
  )
}

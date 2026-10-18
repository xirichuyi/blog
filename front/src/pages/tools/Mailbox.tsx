import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail } from 'lucide-react'
import MailReader from '@/components/MailReader'

// Dedicated IMAP reader page linked from Projects.
export default function Mailbox() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 sm:px-8">
      <Helmet>
        <title>Mail Reader · IMAP · chuyi's blog</title>
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
        <h1 className="text-2xl font-bold tracking-tight">Mail Reader · IMAP</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Read recent messages from Yahoo, Gmail, iCloud, QQ, 163, and other common IMAP providers.
          For Outlook/Hotmail personal accounts, paste the full
          email----password----refresh_token----client_id string. Credentials are used only
          for this session and are never stored.
        </p>
      </header>

      <MailReader />

      <div className="mt-12 space-y-2 border-t border-border/60 pt-6 text-xs leading-relaxed text-muted-foreground">
        <p>
          <span className="font-medium text-foreground/80">Note.</span>{' '}
          Browsers cannot connect directly to IMAP, so the backend relays each request without storing credentials or messages.
        </p>
        <p>
          For most providers, use an app-specific password generated in your IMAP settings, not your
          account password. Outlook/Hotmail personal accounts no longer accept passwords over IMAP, so
          paste the full email----password----refresh_token----client_id string instead — the server
          exchanges the refresh token for a short-lived access token and signs in via XOAUTH2.
        </p>
      </div>
    </div>
  )
}

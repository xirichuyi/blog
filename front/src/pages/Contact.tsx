import { useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { CheckCircle2, Send, Github, Linkedin, MessageCircle, Mail } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

const SOCIALS = [
  { label: 'GitHub', icon: Github, url: 'https://github.com/xirichuyi' },
  { label: 'LinkedIn', icon: Linkedin, url: 'https://www.linkedin.com/in/%E5%88%9D%E4%B8%80-%E6%98%94%E6%97%A5-223012366/' },
  { label: 'Telegram', icon: Send, url: 'https://t.me/xrcy97' },
  { label: 'Linux.do', icon: MessageCircle, url: 'https://linux.do/u/xirichuyi/summary' },
  { label: 'Email', icon: Mail, url: 'mailto:xrcy123@gmail.com' },
]

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const valid = useMemo(
    () => form.name.trim() && form.email.includes('@') && form.message.trim(),
    [form]
  )

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || sending) return
    setSending(true)
    // No public contact endpoint on the backend — simulate submit.
    await new Promise((r) => setTimeout(r, 800))
    setSending(false)
    setSent(true)
    setForm({ name: '', email: '', message: '' })
  }

  return (
    <div className="container max-w-2xl py-16">
      <Helmet>
        <title>Contact · chuyi's blog</title>
      </Helmet>

      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight">Get in touch</h1>
        <p className="mt-3 text-muted-foreground">Got a question or just want to say hi? Drop a message, or find me below.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Send a message</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={submit}>
            <div className="grid gap-2">
              <Label htmlFor="name">Your name *</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" disabled={sending} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@example.com" disabled={sending} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea id="message" rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Write something…" disabled={sending} />
            </div>

            {sent && (
              <div className="flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                Sent — thanks for reaching out!
              </div>
            )}

            <Button type="submit" disabled={!valid || sending}>
              <Send /> {sending ? 'Sending…' : 'Send message'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">Find me online</h2>
        <div className="flex flex-wrap gap-3">
          {SOCIALS.map((s) => {
            const Icon = s.icon
            return (
              <Button key={s.label} variant="outline" asChild>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  <Icon className="size-4" /> {s.label}
                </a>
              </Button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/shadcn/input';
import { Textarea } from '@/components/ui/shadcn/textarea';
import { Label } from '@/components/ui/shadcn/label';
import { CheckCircle2, AlertCircle, Send, Github, Linkedin, MessageCircle } from 'lucide-react';

// 表单数据接口
interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

// 提交状态类型
type SubmitStatus = 'idle' | 'success' | 'error';

const Contact: React.FC = () => {
  // ===================================================================
  // A区 - 数据与状态：所有Hooks调用都放在最上面
  // ===================================================================

  // 表单状态
  const [formData, setFormData] = useState<ContactForm>({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  // UI状态
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');

  // 静态数据
  const contactInfo = useMemo(() => ({
    email: 'xrcy123@gmail.com',
    location: 'San Francisco, CA'
  }), []);

  const socialLinks = useMemo(() => [
    { name: 'GitHub', url: 'https://github.com/xirichuyi', icon: 'code' },
    { name: 'LinkedIn', url: 'https://www.linkedin.com/in/%E5%88%9D%E4%B8%80-%E6%98%94%E6%97%A5-223012366/', icon: 'work' },
    { name: 'Telegram', url: 'https://t.me/xrcy97', icon: 'message' },
    { name: 'Linux.do', url: 'https://linux.do/u/xirichuyi/summary', icon: 'forum' }
  ], []);

  // 表单验证
  const isFormValid = useMemo(() => {
    return Boolean(
      formData.name.trim() &&
      formData.email.trim() &&
      formData.message.trim() &&
      formData.email.includes('@')
    );
  }, [formData]);

  // ===================================================================
  // B区 - 核心逻辑：所有事件处理函数和业务逻辑
  // ===================================================================

  // 表单输入处理
  const handleInputChange = useCallback((field: keyof ContactForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // 清除之前的提交状态
    if (submitStatus !== 'idle') {
      setSubmitStatus('idle');
    }
  }, [submitStatus]);

  // 表单提交处理
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 这里应该调用实际的API
      console.log('Contact form submitted:', formData);

      setSubmitStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isFormValid]);

  // 社交链接点击处理
  const handleSocialClick = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  // 邮件链接点击处理
  const handleEmailClick = useCallback(() => {
    window.location.href = `mailto:${contactInfo.email}`;
  }, [contactInfo.email]);

  // 重置表单
  const handleResetForm = useCallback(() => {
    setFormData({ name: '', email: '', subject: '', message: '' });
    setSubmitStatus('idle');
  }, []);

  // ===================================================================
  // C区 - 渲染：纯声明式渲染
  // ===================================================================

  // 社交平台图标
  const getSocialIcon = (name: string) => {
    switch (name) {
      case 'GitHub': return <Github className="size-4" />;
      case 'LinkedIn': return <Linkedin className="size-4" />;
      case 'Telegram': return <Send className="size-4" />;
      default: return <MessageCircle className="size-4" />;
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Get in Touch</h1>
        <p className="mt-3 text-base text-muted-foreground">
          Have a question or just want to say hi? Send me a message below.
        </p>
      </header>

      {/* 联系表单 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Send a Message</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="contact-name">Your Name *</Label>
              <Input
                id="contact-name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Jane Doe"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contact-email">Email Address *</Label>
              <Input
                id="contact-email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="jane@example.com"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contact-message">Your Message *</Label>
              <Textarea
                id="contact-message"
                rows={5}
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                placeholder="Write your message here…"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* 提交状态消息 */}
            {submitStatus === 'success' && (
              <div className="flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm text-secondary-foreground">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                <span>Message sent successfully! I'll get back to you soon.</span>
              </div>
            )}
            {submitStatus === 'error' && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/50 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>Failed to send message. Please try again or contact me directly.</span>
              </div>
            )}

            <Button type="submit" disabled={!isFormValid || isSubmitting}>
              <Send />
              {isSubmitting ? 'Sending…' : 'Send Message'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 社交链接 */}
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Find Me Online</h2>
        <div className="flex flex-wrap gap-3">
          {socialLinks.map((social, index) => (
            <Button
              key={index}
              variant="outline"
              onClick={() => handleSocialClick(social.url)}
            >
              {getSocialIcon(social.name)}
              {social.name}
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Contact;
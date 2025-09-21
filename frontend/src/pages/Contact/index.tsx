import React, { useState, useCallback, useMemo } from 'react';
import './style.css';

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

  return (
    <div className="contact-page">


      <div className="contact-content">


        {/* 联系表单 */}
        <section className="contact-form-section">
          <h2 className="section-title md-typescale-headline-large">Send a Message</h2>

          <form className="contact-form" onSubmit={handleSubmit}>
            <md-outlined-text-field
              label="Your Name*"
              value={formData.name}
              onInput={(e: any) => handleInputChange('name', e.target.value)}
              required
              className="form-field"
              disabled={isSubmitting}
            />

            <md-outlined-text-field
              label="Email Address*"
              type="email"
              value={formData.email}
              onInput={(e: any) => handleInputChange('email', e.target.value)}
              required
              className="form-field"
              disabled={isSubmitting}
            />

            <md-outlined-text-field
              label="Your Message*"
              type="textarea"
              value={formData.message}
              onInput={(e: any) => handleInputChange('message', e.target.value)}
              required
              className="form-field"
              disabled={isSubmitting}
              style={{ '--md-outlined-text-field-textarea-rows': '4' } as any}
            />

            {/* 提交状态消息 */}
            {submitStatus === 'success' && (
              <div className="form-message success">
                <md-icon>check_circle</md-icon>
                <span>Message sent successfully! I'll get back to you soon.</span>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="form-message error">
                <md-icon>error</md-icon>
                <span>Failed to send message. Please try again or contact me directly.</span>
              </div>
            )}

            {/* 表单操作按钮 */}
            <div className="form-actions">
              <md-filled-button
                onClick={(e: any) => {
                  if (!isFormValid || isSubmitting) return;
                  e.preventDefault();
                  handleSubmit(e);
                }}
                style={{
                  opacity: (!isFormValid || isSubmitting) ? 0.6 : 1,
                  pointerEvents: (!isFormValid || isSubmitting) ? 'none' : 'auto'
                }}
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </md-filled-button>
            </div>
          </form>
        </section>

        {/* 社交链接 */}
        <section className="social-section">
          <h2 className="section-title md-typescale-headline-large">Find Me Online</h2>
          <div className="social-links">
            {socialLinks.map((social, index) => (
              <button
                key={index}
                onClick={() => handleSocialClick(social.url)}
                className="social-link"
              >
                {social.name}
              </button>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};

export default Contact;
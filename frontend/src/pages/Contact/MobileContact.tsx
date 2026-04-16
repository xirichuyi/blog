import React, { useState, useCallback, useMemo } from 'react';
import { Github, Linkedin, MessageCircle, Code } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { logger } from '../../utils/logger';
import './MobileContact.css';

// 表单数据接口
interface ContactForm {
  name: string;
  email: string;
  message: string;
}

// 提交状态类型
type SubmitStatus = 'idle' | 'success' | 'error';

const MobileContact: React.FC = () => {
  // 表单状态
  const [formData, setFormData] = useState<ContactForm>({
    name: '',
    email: '',
    message: ''
  });

  // UI状态
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');

  // 静态数据 - 与PC端一致
  const socialLinks = useMemo(() => [
    { 
      name: 'GitHub', 
      url: 'https://github.com/xirichuyi', 
      icon: <Github size={20} /> 
    },
    { 
      name: 'LinkedIn', 
      url: 'https://www.linkedin.com/in/%E5%88%9D%E4%B8%80-%E6%98%94%E6%97%A5-223012366/', 
      icon: <Linkedin size={20} /> 
    },
    { 
      name: 'Telegram', 
      url: 'https://t.me/xrcy97', 
      icon: <MessageCircle size={20} /> 
    },
    { 
      name: 'Linux.do', 
      url: 'https://linux.do/u/xirichuyi/summary', 
      icon: <Code size={20} /> 
    }
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

  // 表单输入处理
  const handleInputChange = useCallback((field: keyof ContactForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

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
      await new Promise(resolve => setTimeout(resolve, 2000));
      logger.debug('Contact form submitted:', formData);
      setSubmitStatus('success');
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      logger.error('Form submission error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isFormValid]);

  // 社交链接点击处理
  const handleSocialClick = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  return (
    <div className="mobile-contact">
      <div className="mobile-contact-content">
        {/* 社交链接 */}
        <section className="mobile-social-section">
          <h2 className="mobile-section-title">Find Me Online</h2>
          <div className="mobile-social-links">
            {socialLinks.map((social, index) => (
              <button
                key={index}
                onClick={() => handleSocialClick(social.url)}
                className="mobile-social-link"
              >
                {social.icon}
                <span>{social.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 联系表单 */}
        <section className="mobile-contact-form-section">
          <h2 className="mobile-section-title">Send a Message</h2>

          <form className="mobile-contact-form" onSubmit={handleSubmit}>
            <div className="mobile-form-field">
              <label htmlFor="name" className="mobile-form-label">
                Your Name <span className="required">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                className="mobile-form-input"
                disabled={isSubmitting}
                placeholder="Enter your name"
              />
            </div>

            <div className="mobile-form-field">
              <label htmlFor="email" className="mobile-form-label">
                Email Address <span className="required">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
                className="mobile-form-input"
                disabled={isSubmitting}
                placeholder="your.email@example.com"
              />
            </div>

            <div className="mobile-form-field">
              <label htmlFor="message" className="mobile-form-label">
                Your Message <span className="required">*</span>
              </label>
              <textarea
                id="message"
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                required
                className="mobile-form-textarea"
                disabled={isSubmitting}
                placeholder="Enter your message"
                rows={4}
              />
            </div>

            {/* 提交状态消息 */}
            {submitStatus === 'success' && (
              <div className="mobile-form-message mobile-success">
                <span>Message sent successfully! I'll get back to you soon.</span>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="mobile-form-message mobile-error">
                <span>Failed to send message. Please try again or contact me directly.</span>
              </div>
            )}

            {/* 表单操作按钮 */}
            <div className="mobile-form-actions">
              <button
                type="submit"
                className="apple-button-base apple-button-primary mobile-submit-button"
                disabled={!isFormValid || isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default MobileContact;

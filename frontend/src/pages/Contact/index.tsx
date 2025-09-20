import React, { useState } from 'react';
import './style.css';

interface ContactForm {
    name: string;
    email: string;
    subject: string;
    message: string;
}

const Contact: React.FC = () => {
    const [formData, setFormData] = useState<ContactForm>({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const contactInfo = {
        email: 'xrcy123@gmail.com',
        location: 'San Francisco, CA'
    };

    const socialLinks = [
        { name: 'GitHub', url: 'https://github.com/xirichuyi' },
        { name: 'LinkedIn', url: 'https://www.linkedin.com/in/%E5%88%9D%E4%B8%80-%E6%98%94%E6%97%A5-223012366/' },
        { name: 'Telegram', url: 'https://t.me/xrcy97' },
        { name: 'Linux.do', url: 'https://linux.do/u/xirichuyi/summary' }
    ];

    const handleInputChange = (field: keyof ContactForm, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus('idle');

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));

            // For now, just log the form data
            console.log('Contact form submitted:', formData);

            setSubmitStatus('success');
            setFormData({ name: '', email: '', subject: '', message: '' });
        } catch (error) {
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isFormValid = formData.name && formData.email && formData.message;

    return (
        <div className="contact-page">
            {/* Hero Section */}
            {/* <section className="contact-hero">
        <div className="contact-hero-content">
          <h1 className="contact-title md-typescale-display-medium">Get In Touch</h1>
          <p className="contact-subtitle md-typescale-headline-small">
            Let's start a conversation
          </p>
          <p className="contact-description md-typescale-body-large">
            Whether you have a project in mind, want to collaborate, or just want to say hello, 
            I'd love to hear from you. Feel free to reach out through any of the methods below.
          </p>
        </div>
      </section> */}

            <div className="contact-content">
                {/* Contact Info */}
                <section className="contact-info">
                    {/* <div className="contact-details">
            <p className="md-typescale-body-large">
              <strong>Email:</strong> <a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a>
            </p>
            <p className="md-typescale-body-large">
              <strong>Location:</strong> {contactInfo.location}
            </p>
          </div> */}
                </section>

                {/* Simple Contact Form */}
                <section className="contact-form-section">
                    <h2 className="section-title md-typescale-headline-large">Send a Message</h2>
                    <form className="contact-form" onSubmit={handleSubmit}>
                        <md-outlined-text-field
                            label="Your Name"
                            value={formData.name}
                            onInput={(e: any) => handleInputChange('name', e.target.value)}
                            required
                            class="form-field"
                        ></md-outlined-text-field>

                        <md-outlined-text-field
                            label="Email Address"
                            type="email"
                            value={formData.email}
                            onInput={(e: any) => handleInputChange('email', e.target.value)}
                            required
                            class="form-field"
                        ></md-outlined-text-field>

                        <md-outlined-text-field
                            label="Your Message"
                            type="textarea"
                            rows={4}
                            value={formData.message}
                            onInput={(e: any) => handleInputChange('message', e.target.value)}
                            required
                            class="form-field"
                        ></md-outlined-text-field>

                        {submitStatus === 'success' && (
                            <div className="form-message success">
                                Message sent successfully!
                            </div>
                        )}

                        {submitStatus === 'error' && (
                            <div className="form-message error">
                                Failed to send message. Please try again.
                            </div>
                        )}

                        <div className="form-actions">
                            <md-filled-button
                                type="submit"
                                disabled={!isFormValid || isSubmitting}
                            >
                                {isSubmitting ? 'Sending...' : 'Send Message'}
                            </md-filled-button>
                        </div>
                    </form>
                </section>

                {/* Social Links */}
                <section className="social-section">
                    <h2 className="section-title md-typescale-headline-large">Find Me Online</h2>
                    <div className="social-links-simple">
                        {socialLinks.map((social, index) => (
                            <md-text-button
                                key={index}
                                onClick={() => window.open(social.url, '_blank')}
                            >
                                {social.name}
                            </md-text-button>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Contact;

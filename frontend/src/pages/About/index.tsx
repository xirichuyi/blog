import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import './style.css';



const About: React.FC = () => {
    const [title, setTitle] = useState<string>('你好，我是 Chuyi');
    const [subtitle, setSubtitle] = useState<string>('全栈开发者 & 技术爱好者');
    const [content, setContent] = useState<string>('');
    const [photoUrl, setPhotoUrl] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        (async () => {
            const resp = await apiService.getAbout();
            if (resp.success && resp.data) {
                setTitle(resp.data.title || title);
                setSubtitle(resp.data.subtitle || subtitle);
                setContent(resp.data.content || '');
                const url = resp.data.photo_url || '';
                setPhotoUrl(url ? apiService.getImageUrl(url) : '');
            }
            setLoading(false);
        })();
    }, []);

    if (loading) {
        return (
            <div className="about-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <md-circular-progress indeterminate></md-circular-progress>
            </div>
        );
    }

    return (
        <div className="about-page">
            {/* Hero Section - Left Right Layout */}
            <section className="about-hero">
                <div className="about-hero-content">
                    {/* Left Side - Content */}
                    <div className="about-content">
                        <h1 className="about-title md-typescale-display-medium">{title}</h1>
                        <p className="about-subtitle md-typescale-headline-small">{subtitle}</p>
                        <p className="about-description md-typescale-body-large">
                            {content || 'Passionate about creating innovative web applications and sharing knowledge through this blog.'}
                        </p>

                    </div>

                    {/* Right Side - Photo */}
                    <div className="about-photo">
                        <div className="photo-container">
                            <img
                                src={photoUrl || '/api/placeholder/300/400'}
                                alt="chuyi - Full-Stack Developer"
                                className="profile-photo"
                            />
                            <div className="photo-overlay">
                                <md-icon className="camera-icon">photo_camera</md-icon>
                            </div>
                        </div>
                    </div>
                </div>
            </section>




        </div>
    );
};

export default About;

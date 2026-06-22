import React, { useState, useEffect } from 'react';
import { apiService } from '../../../services/api';
import { Card, CardContent } from '@/components/ui/shadcn/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/shadcn/avatar';
import { Button } from '@/components/ui/shadcn/button';
import { Github, Send, Linkedin, MessageCircle, Mail, User } from 'lucide-react';

interface AuthorCardProps {
    className?: string;
}

const AuthorCard: React.FC<AuthorCardProps> = ({ className = '' }) => {
    const [avatar, setAvatar] = useState<string>('');

    useEffect(() => {
        const fetchAbout = async () => {
            try {
                const response = await apiService.getAbout();
                if (response.success && response.data?.photo_url) {
                    setAvatar(apiService.getImageUrl(response.data.photo_url));
                }
            } catch (error) {
                console.error('Failed to fetch about data:', error);
            }
        };
        fetchAbout();
    }, []);

    // 作者信息数据
    const authorInfo = {
        name: 'chuyi',
        title: 'Full Stack Developer & UI/UX Designer',
        socialLinks: {
            github: 'https://github.com/xirichuyi',
            telegram: 'https://t.me/xrcy97',
            linkedin: 'https://www.linkedin.com/in/%E5%88%9D%E4%B8%80-%E6%98%94%E6%97%A5-223012366/',
            linuxdo: 'https://linux.do/u/xirichuyi/summary',
            email: 'xrcy123@gmail.com',
        },
    };

    const handleSocialClick = (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleEmailClick = () => {
        window.location.href = `mailto:${authorInfo.socialLinks.email}`;
    };

    const socials = [
        { label: 'GitHub', icon: Github, onClick: () => handleSocialClick(authorInfo.socialLinks.github) },
        { label: 'Telegram', icon: Send, onClick: () => handleSocialClick(authorInfo.socialLinks.telegram) },
        { label: 'LinkedIn', icon: Linkedin, onClick: () => handleSocialClick(authorInfo.socialLinks.linkedin) },
        { label: 'Linux.do', icon: MessageCircle, onClick: () => handleSocialClick(authorInfo.socialLinks.linuxdo) },
        { label: 'Email', icon: Mail, onClick: handleEmailClick },
    ];

    return (
        <Card className={className}>
            <CardContent className="p-6">
                {/* 头像和基本信息 */}
                <div className="flex items-center gap-4">
                    <Avatar className="size-16 border border-border">
                        {avatar && <AvatarImage src={avatar} alt={authorInfo.name} />}
                        <AvatarFallback>
                            <User className="size-7" />
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <h3 className="truncate text-lg font-semibold text-foreground">{authorInfo.name}</h3>
                        <p className="text-sm text-muted-foreground">{authorInfo.title}</p>
                    </div>
                </div>

                {/* 社交媒体链接 */}
                <div className="mt-4 flex flex-wrap gap-1">
                    {socials.map((s) => {
                        const Icon = s.icon;
                        return (
                            <Button
                                key={s.label}
                                variant="ghost"
                                size="icon"
                                onClick={s.onClick}
                                aria-label={s.label}
                            >
                                <Icon className="size-5" />
                            </Button>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};

export default AuthorCard;

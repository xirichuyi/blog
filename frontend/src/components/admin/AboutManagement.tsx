import React, { useEffect, useRef, useState } from 'react';
import AdminLayout from './AdminLayout';
import { apiService } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import './PostEditor.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3006';

const AboutManagement: React.FC = () => {
    const { showNotification } = useNotification();
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [content, setContent] = useState('');
    const [photoUrl, setPhotoUrl] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        (async () => {
            setIsLoading(true);
            const resp = await apiService.getAbout();
            if (resp.success && resp.data) {
                setTitle(resp.data.title);
                setSubtitle(resp.data.subtitle);
                setContent(resp.data.content);
                setPhotoUrl(resp.data.photo_url ? (resp.data.photo_url.startsWith('http') ? resp.data.photo_url : `${API_BASE_URL}${resp.data.photo_url}`) : '');
            }
            setIsLoading(false);
        })();
    }, []);

    const uploadImage = async (file: File) => {
        setIsUploading(true);
        try {
            const form = new FormData();
            form.append('image', file);
            const resp = await fetch(`${API_BASE_URL}/api/post/upload_post_image`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('admin_token') || 'admin123456'}`,
                },
                body: form,
            });
            const result = await resp.json();
            if (result?.code === 200 && result?.data?.file_url) {
                const url: string = result.data.file_url.startsWith('http') ? result.data.file_url : `${API_BASE_URL}${result.data.file_url}`;
                setPhotoUrl(url);
                showNotification({ type: 'success', title: 'Image Uploaded' });
            } else {
                showNotification({ type: 'error', title: 'Upload Failed' });
            }
        } finally {
            setIsUploading(false);
        }
    };

    const refreshAbout = async () => {
        const resp = await apiService.getAbout();
        if (resp.success && resp.data) {
            setTitle(resp.data.title);
            setSubtitle(resp.data.subtitle);
            setContent(resp.data.content);
            setPhotoUrl(resp.data.photo_url ? (resp.data.photo_url.startsWith('http') ? resp.data.photo_url : `${API_BASE_URL}${resp.data.photo_url}`) : '');
        }
    };

    const save = async () => {
        const payload: any = { title, subtitle, content };
        if (photoUrl) {
            payload.photo_url = photoUrl.startsWith(API_BASE_URL) ? photoUrl.replace(API_BASE_URL, '') : photoUrl;
        }
        const resp = await apiService.updateAbout(payload);
        if (resp.success) {
            showNotification({ type: 'success', title: 'About Saved' });
            await refreshAbout();
        } else {
            showNotification({ type: 'error', title: resp.error || 'Save Failed' });
        }
    };

    if (isLoading) {
        return (
            <AdminLayout title="About Management">
                <div className="post-editor-loading"><md-circular-progress indeterminate></md-circular-progress></div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="About Management">
            <div className="post-editor-form">
                <div className="form-section">
                    <h2 className="md-typescale-headline-small">Basic Info</h2>
                    <md-outlined-text-field label="Title" value={title} onInput={(e: any) => setTitle(e.target.value)} class="title-field"></md-outlined-text-field>
                    <md-outlined-text-field label="Subtitle" value={subtitle} onInput={(e: any) => setSubtitle(e.target.value)} class="title-field"></md-outlined-text-field>
                    <div className="cover-upload-section">
                        <label className="md-typescale-body-large">Profile Image</label>
                        <div className="cover-upload-container">
                            {photoUrl ? (
                                <div className="cover-preview">
                                    <img src={photoUrl} alt="About" className="cover-image" />
                                    <div className="cover-overlay" style={{ pointerEvents: 'auto' }}>
                                        <md-icon-button onClick={() => fileRef.current?.click()} ><md-icon>edit</md-icon></md-icon-button>
                                        <md-icon-button onClick={async () => {
                                            // 立即更新本地 UI
                                            setPhotoUrl('');
                                            // 同步保存到后端
                                            const resp = await apiService.updateAbout({ photo_url: '' });
                                            if (resp.success) {
                                                showNotification({ type: 'success', title: 'Image Removed' });
                                            } else {
                                                showNotification({ type: 'error', title: resp.error || 'Remove Failed' });
                                            }
                                            // 再次从服务端拉取以确保一致
                                            await refreshAbout();
                                        }} >
                                            <md-icon>delete</md-icon>
                                        </md-icon-button>
                                    </div>
                                </div>
                            ) : (
                                <div className="cover-upload-area" onClick={() => fileRef.current?.click()}>
                                    {isUploading ? (<div className="upload-progress"><md-circular-progress indeterminate></md-circular-progress></div>) : (<>
                                        <md-icon class="upload-icon">cloud_upload</md-icon>
                                        <p className="md-typescale-body-large">Upload Image</p>
                                        <p className="md-typescale-body-small">Supported: JPG, PNG, WebP, GIF (Max 10MB)</p>
                                    </>)}
                                </div>
                            )}
                            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.currentTarget.value = ''; }} />
                        </div>
                    </div>
                </div>

                <div className="form-section">
                    <h2 className="md-typescale-headline-small">Content</h2>
                    <md-outlined-text-field label="About Content" type="textarea" rows={12} value={content} onInput={(e: any) => setContent(e.target.value)} class="content-field"></md-outlined-text-field>
                </div>

                <div className="form-section" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <md-filled-button onClick={save}><md-icon slot="icon">save</md-icon>Save</md-filled-button>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AboutManagement;




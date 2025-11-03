import React, { useEffect, useRef, useState } from 'react';
import AdminLayout from '../../../components/adminLayout/AdminLayout';
import { apiService } from '../../../services/api';
import { useNotification } from '../../../contexts/NotificationContext';
import './style.css';



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
                setPhotoUrl(resp.data.photo_url ? apiService.getImageUrl(resp.data.photo_url) : '');
            }
            setIsLoading(false);
        })();
    }, []);

    const uploadImage = async (file: File) => {
        setIsUploading(true);
        try {
            const result = await apiService.uploadPostImage(file);
            if (result.success && result.data?.file_url) {
                const url = apiService.getImageUrl(result.data.file_url);
                setPhotoUrl(url);
                showNotification({ type: 'success', title: 'Image Uploaded' });
            } else {
                showNotification({ type: 'error', title: 'Upload Failed', message: result.error });
            }
        } catch (error) {
            showNotification({ type: 'error', title: 'Upload Failed', message: (error as Error).message });
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
            setPhotoUrl(resp.data.photo_url ? apiService.getImageUrl(resp.data.photo_url) : '');
        }
    };

    const save = async () => {
        const payload: any = { title, subtitle, content };
        if (photoUrl) {
            // Extract relative path from full URL if needed
            payload.photo_url = photoUrl.startsWith('http') ? photoUrl : photoUrl;
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
                <div className="about-management-loading">
                    <md-circular-progress indeterminate></md-circular-progress>
                    <p>Loading about information...</p>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="About Management">
            <div className="about-management-page">
                <div className="about-management-form">
                    {/* Basic Information */}
                    <div className="form-section">
                        <h2>Basic Information</h2>
                        <div className="basic-info-grid">
                            <md-outlined-text-field
                                label="Title"
                                value={title}
                                onInput={(e: any) => setTitle(e.target.value)}
                                className="title-field"
                                required
                            ></md-outlined-text-field>
                            <md-outlined-text-field
                                label="Subtitle"
                                value={subtitle}
                                onInput={(e: any) => setSubtitle(e.target.value)}
                                className="title-field"
                            ></md-outlined-text-field>
                        </div>

                        {/* Profile Image Upload */}
                        <div className="cover-upload-section">
                            <label>Profile Image</label>
                            {photoUrl ? (
                                <div className="image-preview">
                                    <img src={photoUrl} alt="Profile" />
                                    <div className="image-actions">
                                        <md-icon-button onClick={() => fileRef.current?.click()}>
                                            <md-icon>edit</md-icon>
                                        </md-icon-button>
                                        <md-icon-button onClick={async () => {
                                            setPhotoUrl('');
                                            const resp = await apiService.updateAbout({ photo_url: '' });
                                            if (resp.success) {
                                                showNotification({ type: 'success', title: 'Image Removed' });
                                            } else {
                                                showNotification({ type: 'error', title: resp.error || 'Remove Failed' });
                                            }
                                            await refreshAbout();
                                        }}>
                                            <md-icon>delete</md-icon>
                                        </md-icon-button>
                                    </div>
                                </div>
                            ) : (
                                <div className="upload-area" onClick={() => fileRef.current?.click()}>
                                    {isUploading ? (
                                        <div className="upload-progress">
                                            <md-circular-progress indeterminate></md-circular-progress>
                                            <p>Uploading...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <md-icon>cloud_upload</md-icon>
                                            <p>Click to upload image</p>
                                            <span>JPG, PNG, WebP, GIF (Max 10MB)</span>
                                        </>
                                    )}
                                </div>
                            )}
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) uploadImage(f);
                                    e.currentTarget.value = '';
                                }}
                            />
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="form-section">
                        <h2>About Content</h2>
                        <md-outlined-text-field
                            label="Write about yourself..."
                            type="textarea"
                            value={content}
                            onInput={(e: any) => setContent(e.target.value)}
                            style={{
                                '--md-outlined-text-field-container-shape': '12px',
                                '--md-outlined-text-field-textarea-rows': '12',
                                '--md-outlined-text-field-textarea-resizable': 'none',
                                width: '100%'
                            } as React.CSSProperties}
                        ></md-outlined-text-field>
                        <div className="content-help">
                            <md-icon>info</md-icon>
                            <p>You can use markdown formatting in your content</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="form-actions">
                        <md-filled-button onClick={save}>
                            <md-icon slot="icon">save</md-icon>
                            Save Changes
                        </md-filled-button>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AboutManagement;




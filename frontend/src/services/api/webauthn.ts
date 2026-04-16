import { BaseApiService } from './base';
import { bufferToBase64url } from '../../utils/webauthn';
import type { ApiResponse } from '../types';

export class WebauthnApiService extends BaseApiService {
    async hasCredentials(): Promise<ApiResponse<{ has_credentials: boolean }>> {
        return this.request('/webauthn/has-credentials');
    }

    async authStart(): Promise<ApiResponse<any>> {
        return this.request('/webauthn/auth-start');
    }

    async authFinish(credential: PublicKeyCredential, challengeId: string): Promise<ApiResponse<any>> {
        const authResp = credential.response as AuthenticatorAssertionResponse;
        const response = await fetch(`${this.baseURL}/webauthn/auth-finish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                challenge_id: challengeId,
                credential: {
                    id: credential.id,
                    rawId: bufferToBase64url(credential.rawId),
                    type: credential.type,
                    response: {
                        authenticatorData: bufferToBase64url(authResp.authenticatorData),
                        clientDataJSON: bufferToBase64url(authResp.clientDataJSON),
                        signature: bufferToBase64url(authResp.signature),
                        ...(authResp.userHandle && { userHandle: bufferToBase64url(authResp.userHandle) }),
                    },
                },
            }),
        });
        const data = await response.json();
        return { success: response.ok && data.code === 200, data };
    }

    async registerStart(): Promise<ApiResponse<any>> {
        return this.request('/admin/webauthn/register-start');
    }

    async registerFinishRaw(credentialData: any, name: string, challengeId: string): Promise<ApiResponse<any>> {
        const response = await fetch(`${this.baseURL}/admin/webauthn/register-finish`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ credential: credentialData, name, challenge_id: challengeId }),
        });
        const data = await response.json();
        return { success: response.ok && data.code === 200, data };
    }

    async listCredentials(): Promise<ApiResponse<any>> {
        return this.request('/admin/webauthn/credentials');
    }

    async deleteCredential(id: string): Promise<ApiResponse<any>> {
        const response = await fetch(`${this.baseURL}/admin/webauthn/credentials`, {
            method: 'DELETE',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ id }),
        });
        const data = await response.json();
        return { success: response.ok && data.code === 200, data };
    }
}

import { BaseApiService } from './base';
import type { ApiResponse } from '../types';

export class WebauthnApiService extends BaseApiService {
    /** Check if any passkeys are registered (public) */
    async hasCredentials(): Promise<ApiResponse<{ has_credentials: boolean }>> {
        return this.request('/webauthn/has-credentials');
    }

    /** Start WebAuthn authentication ceremony (public) */
    async authStart(): Promise<ApiResponse<any>> {
        return this.request('/webauthn/auth-start');
    }

    /** Finish WebAuthn authentication ceremony (public) */
    async authFinish(credential: PublicKeyCredential): Promise<ApiResponse<any>> {
        const authResp = credential.response as AuthenticatorAssertionResponse;
        const body = {
            credential: {
                id: credential.id,
                rawId: this.bufferToBase64url(credential.rawId),
                type: credential.type,
                response: {
                    authenticatorData: this.bufferToBase64url(authResp.authenticatorData),
                    clientDataJSON: this.bufferToBase64url(authResp.clientDataJSON),
                    signature: this.bufferToBase64url(authResp.signature),
                    ...(authResp.userHandle && { userHandle: this.bufferToBase64url(authResp.userHandle) }),
                },
            },
        };
        const response = await fetch(`${this.baseURL}/webauthn/auth-finish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        return { success: response.ok && data.code === 200, data };
    }

    /** Start registration ceremony (admin, requires token) */
    async registerStart(): Promise<ApiResponse<any>> {
        return this.request('/admin/webauthn/register-start');
    }

    /** Finish registration ceremony (admin, requires token) */
    async registerFinish(credential: PublicKeyCredential, name: string): Promise<ApiResponse<any>> {
        const attestResp = credential.response as AuthenticatorAttestationResponse;
        const body = {
            credential: {
                id: credential.id,
                rawId: this.bufferToBase64url(credential.rawId),
                type: credential.type,
                response: {
                    attestationObject: this.bufferToBase64url(attestResp.attestationObject),
                    clientDataJSON: this.bufferToBase64url(attestResp.clientDataJSON),
                },
            },
            name,
        };
        const response = await fetch(`${this.baseURL}/admin/webauthn/register-finish`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(body),
        });
        const data = await response.json();
        return { success: response.ok && data.code === 200, data };
    }

    /** Finish registration with pre-serialized credential JSON (admin) */
    async registerFinishRaw(credentialData: any, name: string): Promise<ApiResponse<any>> {
        const response = await fetch(`${this.baseURL}/admin/webauthn/register-finish`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ credential: credentialData, name }),
        });
        const data = await response.json();
        return { success: response.ok && data.code === 200, data };
    }

    /** List registered credentials (admin) */
    async listCredentials(): Promise<ApiResponse<any>> {
        return this.request('/admin/webauthn/credentials');
    }

    /** Delete a credential (admin) */
    async deleteCredential(id: string): Promise<ApiResponse<any>> {
        const response = await fetch(`${this.baseURL}/admin/webauthn/credentials`, {
            method: 'DELETE',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ id }),
        });
        const data = await response.json();
        return { success: response.ok && data.code === 200, data };
    }

    private bufferToBase64url(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (const byte of bytes) {
            binary += String.fromCharCode(byte);
        }
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
}

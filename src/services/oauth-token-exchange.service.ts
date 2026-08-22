import { clearCodeVerifier, getCodeVerifier, isProduction } from '@/components/shared';
import { ErrorLogger } from '@/utils/error-logger';

interface TokenExchangeResponse {
    access_token?: string;
    token_type?: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
    error?: string;
    error_description?: string;
}

interface AuthInfo {
    access_token: string;
    token_type: string;
    expires_in: number;
    expires_at: number;
    scope?: string;
    refresh_token?: string;
}

export class OAuthTokenExchangeService {
    static getAuthInfo(): AuthInfo | null {
        try {
            const raw = sessionStorage.getItem('auth_info');
            if (!raw) return null;
            const info = JSON.parse(raw) as AuthInfo;
            if (info.expires_at && Date.now() >= info.expires_at) {
                this.clearAuthInfo();
                return null;
            }
            return info;
        } catch {
            return null;
        }
    }

    static clearAuthInfo(): void {
        sessionStorage.removeItem('auth_info');
        sessionStorage.removeItem('deriv_accounts');
    }

    static isAuthenticated(): boolean {
        return !!this.getAuthInfo()?.access_token;
    }

    static getAccessToken(): string | null {
        return this.getAuthInfo()?.access_token || null;
    }

    static async exchangeCodeForToken(code: string): Promise<TokenExchangeResponse> {
        const codeVerifier = getCodeVerifier();

        if (!codeVerifier || !code) {
            return {
                error: 'invalid_request',
                error_description: 'OAuth authorization code or PKCE verifier is missing. Please restart login.',
            };
        }

        try {
            // The authorization-code exchange is deliberately performed by the
            // Vercel serverless endpoint. The browser never calls Deriv's token
            // endpoint directly.
            const response = await fetch('/api/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    code,
                    code_verifier: codeVerifier,
                    redirect_uri: window.location.origin,
                }),
            });

            const data = (await response.json()) as TokenExchangeResponse;
            if (!response.ok || data.error || !data.access_token) {
                return {
                    error: data.error || 'token_exchange_failed',
                    error_description: data.error_description || `OAuth token exchange failed (${response.status})`,
                };
            }

            clearCodeVerifier();
            const authInfo: AuthInfo = {
                access_token: data.access_token,
                token_type: data.token_type || 'bearer',
                expires_in: data.expires_in || 3600,
                expires_at: Date.now() + (data.expires_in || 3600) * 1000,
                scope: data.scope,
                refresh_token: data.refresh_token,
            };
            sessionStorage.setItem('auth_info', JSON.stringify(authInfo));

            const { DerivWSAccountsService } = await import('./derivws-accounts.service');
            const accounts = await DerivWSAccountsService.fetchAccountsList(data.access_token);
            if (!accounts.length) {
                this.clearAuthInfo();
                return { error: 'no_accounts', error_description: 'No Deriv accounts were returned.' };
            }

            const selectedId = localStorage.getItem('active_loginid');
            const active = accounts.find(account => account.account_id === selectedId) || accounts[0];
            localStorage.setItem('active_loginid', active.account_id);
            localStorage.setItem('account_type', active.account_type);
            DerivWSAccountsService.storeAccounts(accounts);

            const { api_base } = await import('@/external/bot-skeleton');
            await api_base.init(true);
            return data;
        } catch (error) {
            ErrorLogger.error('OAuth', 'OAuth login initialization failed', error);
            this.clearAuthInfo();
            return {
                error: 'network_error',
                error_description: error instanceof Error ? error.message : 'OAuth login failed',
            };
        }
    }
}

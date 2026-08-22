import { clearCodeVerifier, getCodeVerifier, getOAuthRedirectURL, isProduction } from '@/components/shared';
import { ErrorLogger } from '@/utils/error-logger';
import brandConfig from '../../brand.config.json';

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
    private static getOAuth2BaseURL(): string {
        const environment = isProduction() ? 'production' : 'staging';
        return brandConfig.platform.auth2_url[environment];
    }

    static getAuthInfo(): AuthInfo | null {
        try {
            const value = sessionStorage.getItem('auth_info');
            if (!value) return null;
            const authInfo: AuthInfo = JSON.parse(value);
            if (authInfo.expires_at && Date.now() >= authInfo.expires_at) {
                this.clearAuthInfo();
                return null;
            }
            return authInfo;
        } catch (error) {
            ErrorLogger.error('OAuth', 'Error parsing auth_info', error);
            return null;
        }
    }

    static clearAuthInfo(): void {
        sessionStorage.removeItem('auth_info');
    }

    static isAuthenticated(): boolean {
        return !!this.getAuthInfo()?.access_token;
    }

    static getAccessToken(): string | null {
        return this.getAuthInfo()?.access_token || null;
    }

    static async exchangeCodeForToken(code: string): Promise<TokenExchangeResponse> {
        try {
            const codeVerifier = getCodeVerifier();
            const clientId = process.env.DERIV_OAUTH_CLIENT_ID;
            const redirectUrl = getOAuthRedirectURL();

            if (!codeVerifier) {
                return { error: 'invalid_request', error_description: 'PKCE code verifier not found or expired.' };
            }
            if (!clientId) {
                return { error: 'invalid_client', error_description: 'DERIV_OAUTH_CLIENT_ID is not configured.' };
            }

            const requestBody = new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                client_id: clientId,
                redirect_uri: redirectUrl,
                code_verifier: codeVerifier,
            });

            const response = await fetch(`${this.getOAuth2BaseURL()}token`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: requestBody.toString(),
            });

            const data: TokenExchangeResponse = await response.json();
            if (!response.ok || data.error || !data.access_token) {
                ErrorLogger.error('OAuth', `Token exchange failed: ${data.error || response.status}`, data);
                return { error: data.error || 'token_exchange_failed', error_description: data.error_description || 'Unable to exchange authorization code.' };
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
                return { error: 'no_accounts', error_description: 'No Deriv accounts were returned for this authenticated user.' };
            }

            DerivWSAccountsService.storeAccounts(accounts);
            const firstAccount = accounts[0];
            localStorage.setItem('active_loginid', firstAccount.account_id);
            const isDemo = firstAccount.account_type === 'demo' || firstAccount.account_id.startsWith('VRT');
            localStorage.setItem('account_type', isDemo ? 'demo' : 'real');

            const { api_base } = await import('@/external/bot-skeleton');
            await api_base.init(true);
            return data;
        } catch (error: unknown) {
            ErrorLogger.error('OAuth', 'Token exchange/account initialization error', error);
            return { error: 'network_error', error_description: error instanceof Error ? error.message : 'Unknown error occurred' };
        }
    }

    static async refreshAccessToken(refreshToken: string): Promise<TokenExchangeResponse> {
        try {
            const response = await fetch(`${this.getOAuth2BaseURL()}token`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }).toString(),
            });
            const data: TokenExchangeResponse = await response.json();
            if (!response.ok || data.error || !data.access_token) return data;

            const existing = this.getAuthInfo();
            sessionStorage.setItem('auth_info', JSON.stringify({
                access_token: data.access_token,
                token_type: data.token_type || 'bearer',
                expires_in: data.expires_in || 3600,
                expires_at: Date.now() + (data.expires_in || 3600) * 1000,
                scope: data.scope,
                refresh_token: data.refresh_token || existing?.refresh_token,
            }));
            return data;
        } catch (error: unknown) {
            return { error: 'network_error', error_description: error instanceof Error ? error.message : 'Unknown error occurred' };
        }
    }
}

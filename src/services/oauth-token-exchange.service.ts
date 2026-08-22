import { clearCodeVerifier, getCodeVerifier, isProduction } from '@/components/shared';
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
        return brandConfig.platform.auth2_url[isProduction() ? 'production' : 'staging'];
    }

    private static getClientId(): string {
        return process.env.Deriv_OAuth_Client_id || process.env.CLIENT_ID || '';
    }

    private static getRedirectUrl(): string {
        const configured = process.env.Deriv_redirect_url?.trim();
        return configured ? configured.replace(/\/$/, '') : `${window.location.protocol}//${window.location.host}`;
    }

    static getAuthInfo(): AuthInfo | null {
        try {
            const raw = sessionStorage.getItem('auth_info');
            if (!raw) return null;
            const authInfo = JSON.parse(raw) as AuthInfo;
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

    private static storeAuthInfo(data: TokenExchangeResponse): void {
        if (!data.access_token) return;
        const authInfo: AuthInfo = {
            access_token: data.access_token,
            token_type: data.token_type || 'bearer',
            expires_in: data.expires_in || 3600,
            expires_at: Date.now() + (data.expires_in || 3600) * 1000,
            scope: data.scope,
            ...(data.refresh_token ? { refresh_token: data.refresh_token } : {}),
        };
        sessionStorage.setItem('auth_info', JSON.stringify(authInfo));
    }

    private static async initializeExactDerivAccount(accessToken: string): Promise<TokenExchangeResponse | null> {
        try {
            const { DerivWSAccountsService } = await import('./derivws-accounts.service');
            // This authenticated endpoint returns Deriv's account records, including the actual
            // account_id, currency and balance for each account available to this OAuth session.
            const accounts = await DerivWSAccountsService.fetchAccountsList(accessToken);
            if (!accounts?.length) {
                this.clearAuthInfo();
                return { error: 'no_accounts', error_description: 'No Deriv accounts were returned for this OAuth session.' };
            }

            DerivWSAccountsService.storeAccounts(accounts);
            const activeLoginId = localStorage.getItem('active_loginid');
            const active = accounts.find(account => account.account_id === activeLoginId) || accounts[0];
            localStorage.setItem('active_loginid', active.account_id);
            const isDemo = active.account_id.startsWith('VRT') || active.account_id.startsWith('VRTC') || active.account_type === 'demo';
            localStorage.setItem('account_type', isDemo ? 'demo' : 'real');

            // Force a fresh authenticated WebSocket/OTP connection. Account switching honours
            // active_loginid, so later balance refreshes are tied to the selected exact account.
            const { api_base } = await import('@/external/bot-skeleton');
            await api_base.init(true);
            return null;
        } catch (error) {
            ErrorLogger.error('OAuth', 'Error fetching Deriv accounts after token exchange', error);
            this.clearAuthInfo();
            return {
                error: 'account_fetch_failed',
                error_description: error instanceof Error ? error.message : 'Failed to fetch Deriv accounts after authentication',
            };
        }
    }

    static async exchangeCodeForToken(code: string): Promise<TokenExchangeResponse> {
        try {
            const codeVerifier = getCodeVerifier();
            if (!codeVerifier) {
                return { error: 'invalid_request', error_description: 'PKCE code verifier not found or expired. Please restart login.' };
            }
            const clientId = this.getClientId();
            const redirectUrl = this.getRedirectUrl();
            if (!clientId) {
                return { error: 'invalid_client', error_description: 'Deriv_OAuth_Client_id is not configured.' };
            }

            const response = await fetch(`${this.getOAuth2BaseURL()}token`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    client_id: clientId,
                    redirect_uri: redirectUrl,
                    code_verifier: codeVerifier,
                }).toString(),
            });
            const data: TokenExchangeResponse = await response.json();
            if (!response.ok || data.error) {
                return { error: data.error || 'token_exchange_failed', error_description: data.error_description || `OAuth token exchange failed (${response.status}).` };
            }

            if (data.access_token) {
                clearCodeVerifier();
                this.storeAuthInfo(data);
                const initError = await this.initializeExactDerivAccount(data.access_token);
                if (initError) return initError;
            }
            return data;
        } catch (error) {
            ErrorLogger.error('OAuth', 'Token exchange network or parsing error', error);
            return { error: 'network_error', error_description: error instanceof Error ? error.message : 'Unknown error occurred' };
        }
    }

    static async refreshAccessToken(refreshToken: string): Promise<TokenExchangeResponse> {
        try {
            const response = await fetch(`${this.getOAuth2BaseURL()}token`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: this.getClientId() }).toString(),
            });
            const data: TokenExchangeResponse = await response.json();
            if (data.error) return data;
            if (data.access_token) {
                if (!data.refresh_token) data.refresh_token = this.getAuthInfo()?.refresh_token;
                this.storeAuthInfo(data);
            }
            return data;
        } catch (error) {
            ErrorLogger.error('OAuth', 'Token refresh error', error);
            return { error: 'network_error', error_description: error instanceof Error ? error.message : 'Unknown error occurred' };
        }
    }
}

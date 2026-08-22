import { isProduction } from '@/components/shared';
import brandConfig from '../../brand.config.json';

export interface DerivAccount {
    account_id: string;
    balance: string;
    currency: string;
    group: string;
    status: string;
    account_type: 'demo' | 'real';
}

interface AccountsResponse {
    data: DerivAccount[];
}

interface OTPResponseData {
    url: string;
}

interface OTPResponse {
    data: OTPResponseData;
}

export class DerivWSAccountsService {
    private static accountsFetchPromise: Promise<DerivAccount[]> | null = null;
    private static otpFetchPromises: Map<string, Promise<string>> = new Map();

    private static getDerivWSBaseURL(): string {
        const environment = isProduction() ? 'production' : 'staging';
        return brandConfig.platform.derivws.url[environment];
    }

    private static getAppId(): string | undefined {
        return process.env.DERIV_APP_ID || process.env.DERIV_OAUTH_CLIENT_ID;
    }

    private static getAuthHeaders(accessToken: string): HeadersInit {
        const appId = this.getAppId();
        return {
            Authorization: `Bearer ${accessToken}`,
            ...(appId ? { 'Deriv-App-ID': appId } : {}),
        };
    }

    static clearCache(): void {
        this.accountsFetchPromise = null;
        this.otpFetchPromises.clear();
    }

    static storeAccounts(accounts: DerivAccount[]): void {
        sessionStorage.setItem('deriv_accounts', JSON.stringify(accounts));
    }

    static getStoredAccounts(): DerivAccount[] | null {
        try {
            const accountsStr = sessionStorage.getItem('deriv_accounts');
            if (!accountsStr) return null;
            return JSON.parse(accountsStr) as DerivAccount[];
        } catch (error) {
            console.error('[DerivWS] Error parsing stored accounts:', error);
            return null;
        }
    }

    static getDefaultAccount(): DerivAccount | null {
        const accounts = this.getStoredAccounts();
        if (!accounts || accounts.length === 0) return null;
        return accounts[0];
    }

    static clearStoredAccounts(): void {
        sessionStorage.removeItem('deriv_accounts');
    }

    static async fetchAccountsList(accessToken: string): Promise<DerivAccount[]> {
        if (this.accountsFetchPromise) return this.accountsFetchPromise;

        this.accountsFetchPromise = (async () => {
            try {
                const baseURL = this.getDerivWSBaseURL();
                const optionsDir = brandConfig.platform.derivws.directories.options;
                const endpoint = `${baseURL}${optionsDir}accounts`;

                const response = await fetch(endpoint, {
                    method: 'GET',
                    headers: this.getAuthHeaders(accessToken),
                });

                if (!response.ok) {
                    const details = await response.text().catch(() => '');
                    throw new Error(`Failed to fetch accounts: ${response.status} ${response.statusText}${details ? ` - ${details}` : ''}`);
                }

                const data: AccountsResponse = await response.json();
                const accounts = data?.data || [];
                if (accounts.length === 0) console.warn('[DerivWS] No accounts found in response');
                this.storeAccounts(accounts);
                return accounts;
            } catch (error) {
                console.error('[DerivWS] Error fetching accounts:', error);
                this.accountsFetchPromise = null;
                throw error;
            } finally {
                setTimeout(() => {
                    this.accountsFetchPromise = null;
                }, 100);
            }
        })();

        return this.accountsFetchPromise;
    }

    static async fetchOTPWebSocketURL(accessToken: string, accountId: string): Promise<string> {
        const cacheKey = `${accountId}`;
        if (this.otpFetchPromises.has(cacheKey)) return this.otpFetchPromises.get(cacheKey)!;

        const otpPromise = (async () => {
            try {
                const baseURL = this.getDerivWSBaseURL();
                const optionsDir = brandConfig.platform.derivws.directories.options;
                const endpoint = `${baseURL}${optionsDir}accounts/${accountId}/otp`;

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: this.getAuthHeaders(accessToken),
                });

                if (!response.ok) {
                    const details = await response.text().catch(() => '');
                    throw new Error(`Failed to fetch OTP: ${response.status} ${response.statusText}${details ? ` - ${details}` : ''}`);
                }

                const otpResponse: OTPResponse = await response.json();
                const websocketURL = otpResponse.data.url;
                if (!websocketURL) throw new Error('WebSocket URL not found in OTP response');
                return websocketURL;
            } catch (error) {
                console.error('[DerivWS] Error fetching OTP:', error);
                this.otpFetchPromises.delete(cacheKey);
                throw error;
            } finally {
                setTimeout(() => this.otpFetchPromises.delete(cacheKey), 100);
            }
        })();

        this.otpFetchPromises.set(cacheKey, otpPromise);
        return otpPromise;
    }

    static async getAuthenticatedWebSocketURL(accessToken: string): Promise<string> {
        try {
            let accounts = this.getStoredAccounts();
            if (!accounts || accounts.length === 0) {
                accounts = await this.fetchAccountsList(accessToken);
                if (!accounts || accounts.length === 0) throw new Error('No accounts available');
            }

            const activeLoginId = localStorage.getItem('active_loginid');
            const targetAccount = (activeLoginId && accounts.find(a => a.account_id === activeLoginId)) || accounts[0];
            return await this.fetchOTPWebSocketURL(accessToken, targetAccount.account_id);
        } catch (error) {
            console.error('[DerivWS] Error in authenticated WebSocket URL flow:', error);
            throw error;
        }
    }
}

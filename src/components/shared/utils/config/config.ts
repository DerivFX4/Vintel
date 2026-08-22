import { DerivWSAccountsService } from '@/services/derivws-accounts.service';
import { OAuthTokenExchangeService } from '@/services/oauth-token-exchange.service';
import brandConfig from '../../../../../brand.config.json';

export const PRODUCTION_DOMAINS = {
    COM: brandConfig.platform.hostname.production.com,
} as const;

export const STAGING_DOMAINS = {
    COM: brandConfig.platform.hostname.staging.com,
} as const;

export const WS_SERVERS = {
    STAGING: `${brandConfig.platform.derivws.url.staging}options/ws/public`,
    PRODUCTION: `${brandConfig.platform.derivws.url.production}options/ws/public`,
} as const;

export const isProduction = () => {
    const hostname = window.location.hostname;
    const productionDomains = Object.values(PRODUCTION_DOMAINS) as string[];
    return productionDomains.includes(hostname);
};

export const isLocal = () => /localhost(:\d+)?$/i.test(window.location.hostname);

const getDefaultServerURL = () => (isProduction() ? WS_SERVERS.PRODUCTION : WS_SERVERS.STAGING);

export const getSocketURL = async (): Promise<string> => {
    try {
        const authInfo = OAuthTokenExchangeService.getAuthInfo();
        if (!authInfo?.access_token) return getDefaultServerURL();
        return await DerivWSAccountsService.getAuthenticatedWebSocketURL(authInfo.access_token);
    } catch (error) {
        console.error('[DerivWS] Error in getSocketURL:', error);
        return getDefaultServerURL();
    }
};

export const getDebugServiceWorker = () => {
    const flag = window.localStorage.getItem('debug_service_worker');
    return flag ? !!parseInt(flag) : false;
};

const generateCSRFToken = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const generateCodeVerifier = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const generateCodeChallenge = async (verifier: string): Promise<string> => {
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return btoa(String.fromCharCode(...Array.from(new Uint8Array(hashBuffer))))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
};

const storeCodeVerifier = (verifier: string): void => {
    sessionStorage.setItem('oauth_code_verifier', verifier);
    sessionStorage.setItem('oauth_code_verifier_timestamp', Date.now().toString());
};

export const getCodeVerifier = (): string | null => {
    const verifier = sessionStorage.getItem('oauth_code_verifier');
    const timestamp = sessionStorage.getItem('oauth_code_verifier_timestamp');
    if (!verifier || !timestamp) return null;
    if (Date.now() - parseInt(timestamp, 10) > 600000) {
        clearCodeVerifier();
        return null;
    }
    return verifier;
};

export const clearCodeVerifier = (): void => {
    sessionStorage.removeItem('oauth_code_verifier');
    sessionStorage.removeItem('oauth_code_verifier_timestamp');
};

const storeCSRFToken = (token: string): void => {
    sessionStorage.setItem('oauth_csrf_token', token);
    sessionStorage.setItem('oauth_csrf_token_timestamp', Date.now().toString());
};

export const validateCSRFToken = (token: string): boolean => {
    const storedToken = sessionStorage.getItem('oauth_csrf_token');
    const timestamp = sessionStorage.getItem('oauth_csrf_token_timestamp');
    if (!storedToken || !timestamp || storedToken !== token) return false;
    if (Date.now() - parseInt(timestamp, 10) > 600000) {
        clearCSRFToken();
        return false;
    }
    return true;
};

export const clearCSRFToken = (): void => {
    sessionStorage.removeItem('oauth_csrf_token');
    sessionStorage.removeItem('oauth_csrf_token_timestamp');
};

const normalizeScopes = (value?: string): string =>
    (value || 'trade application_read payments')
        .split(/[\s,]+/)
        .map(scope => scope.trim())
        .filter(Boolean)
        .join(' ');

export const getOAuthRedirectURL = (): string => {
    const configured = process.env.DERIV_REDIRECT_URL?.trim();
    if (configured) return configured.replace(/\/$/, '');
    return `${window.location.protocol}//${window.location.host}`;
};

export const generateOAuthURL = async (prompt?: string) => {
    try {
        const environment = isProduction() ? 'production' : 'staging';
        const hostname = brandConfig?.platform.auth2_url?.[environment];
        const clientId = process.env.DERIV_OAUTH_CLIENT_ID;
        const appId = process.env.DERIV_APP_ID;
        const redirectUrl = getOAuthRedirectURL();
        const scopes = normalizeScopes(process.env.DERIV_OAUTH_SCOPE);

        if (!hostname || !clientId || !appId || !redirectUrl || !scopes) {
            console.error('Missing Deriv OAuth configuration');
            return '';
        }

        const csrfToken = generateCSRFToken();
        storeCSRFToken(csrfToken);

        const codeVerifier = generateCodeVerifier();
        const codeChallenge = await generateCodeChallenge(codeVerifier);
        storeCodeVerifier(codeVerifier);

        const params = new URLSearchParams({
            scope: scopes,
            response_type: 'code',
            client_id: clientId,
            redirect_uri: redirectUrl,
            state: csrfToken,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
            app_id: appId,
        });

        if (prompt) params.set('prompt', prompt);
        return `${hostname}auth?${params.toString()}`;
    } catch (error) {
        console.error('Error generating OAuth URL:', error);
        return '';
    }
};

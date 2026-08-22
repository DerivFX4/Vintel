import { DerivWSAccountsService } from '@/services/derivws-accounts.service';
import { OAuthTokenExchangeService } from '@/services/oauth-token-exchange.service';
import brandConfig from '../../../../../brand.config.json';

export const PRODUCTION_DOMAINS = { COM: brandConfig.platform.hostname.production.com } as const;
export const STAGING_DOMAINS = { COM: brandConfig.platform.hostname.staging.com } as const;
export const WS_SERVERS = {
    STAGING: `${brandConfig.platform.derivws.url.staging}options/ws/public`,
    PRODUCTION: `${brandConfig.platform.derivws.url.production}options/ws/public`,
} as const;

export const isProduction = () => Object.values(PRODUCTION_DOMAINS).includes(window.location.hostname as never);
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
    const value = window.localStorage.getItem('debug_service_worker');
    return value ? !!parseInt(value, 10) : false;
};

const toBase64Url = (bytes: Uint8Array) =>
    btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

const generateCSRFToken = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return toBase64Url(array);
};

const generateCodeVerifier = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return toBase64Url(array);
};

const generateCodeChallenge = async (verifier: string): Promise<string> => {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return toBase64Url(new Uint8Array(hash));
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

/** Exact Vercel variables are compiled into the client by rsbuild.config.ts. */
export const getDerivOAuthClientId = () => process.env.Deriv_OAuth_Client_id || process.env.CLIENT_ID || '';
export const getDerivAppId = () => process.env.Deriv_app_id || process.env.APP_ID || '';
export const getDerivRedirectUrl = () => {
    const configured = process.env.Deriv_redirect_url?.trim();
    return configured ? configured.replace(/\/$/, '') : `${window.location.protocol}//${window.location.host}`;
};
export const getDerivOAuthScope = () => {
    const configured = process.env.Deriv_AOuth_scope?.trim();
    // OAuth authorization servers normally require space-delimited scopes. Accept the user's
    // comma-separated Vercel value and normalize it before sending the authorization request.
    return (configured || 'trade application_read payments').split(',').map(s => s.trim()).filter(Boolean).join(' ');
};

export const generateOAuthURL = async (prompt?: string) => {
    try {
        const environment = isProduction() ? 'production' : 'staging';
        const hostname = brandConfig.platform.auth2_url[environment];
        const clientId = getDerivOAuthClientId();
        const appId = getDerivAppId();
        const redirectUrl = getDerivRedirectUrl();
        const scopes = getDerivOAuthScope();

        if (!hostname || !clientId || !redirectUrl) {
            console.error('[OAuth] Missing Deriv OAuth configuration');
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
        });
        if (prompt) params.set('prompt', prompt);
        if (appId) params.set('app_id', appId);
        return `${hostname}auth?${params.toString()}`;
    } catch (error) {
        console.error('Error generating OAuth URL:', error);
        return '';
    }
};

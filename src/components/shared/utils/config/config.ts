import brandConfig from '../../../../../brand.config.json';

export const PRODUCTION_DOMAINS = { COM: brandConfig.platform.hostname.production.com } as const;
export const STAGING_DOMAINS = { COM: brandConfig.platform.hostname.staging.com } as const;
export const WS_SERVERS = {
    STAGING: `${brandConfig.platform.derivws.url.staging}options/ws/public`,
    PRODUCTION: `${brandConfig.platform.derivws.url.production}options/ws/public`,
} as const;

export const isProduction = () => Object.values(PRODUCTION_DOMAINS).includes(window.location.hostname);
export const isLocal = () => /localhost(:\d+)?$/i.test(window.location.hostname);

const getDefaultServerURL = () => (isProduction() ? WS_SERVERS.PRODUCTION : WS_SERVERS.STAGING);

/** Authenticated account connections are created after OAuth succeeds. */
export const getSocketURL = async (): Promise<string> => {
    try {
        const { OAuthTokenExchangeService } = await import('@/services/oauth-token-exchange.service');
        const { DerivWSAccountsService } = await import('@/services/derivws-accounts.service');
        const accessToken = OAuthTokenExchangeService.getAccessToken();
        if (!accessToken) return getDefaultServerURL();
        return await DerivWSAccountsService.getAuthenticatedWebSocketURL(accessToken);
    } catch (error) {
        console.error('[DerivWS] authenticated socket unavailable', error);
        return getDefaultServerURL();
    }
};

export const getDebugServiceWorker = () => !!parseInt(window.localStorage.getItem('debug_service_worker') || '0', 10);

const generateCSRFToken = (): string => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const generateCodeVerifier = (): string => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const generateCodeChallenge = async (verifier: string): Promise<string> => {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return btoa(String.fromCharCode(...Array.from(new Uint8Array(hash))))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
};

const storeCodeVerifier = (value: string) => {
    sessionStorage.setItem('oauth_code_verifier', value);
    sessionStorage.setItem('oauth_code_verifier_timestamp', Date.now().toString());
};

export const getCodeVerifier = (): string | null => {
    const value = sessionStorage.getItem('oauth_code_verifier');
    const timestamp = Number(sessionStorage.getItem('oauth_code_verifier_timestamp'));
    if (!value || !timestamp || Date.now() - timestamp > 600000) {
        clearCodeVerifier();
        return null;
    }
    return value;
};

export const clearCodeVerifier = () => {
    sessionStorage.removeItem('oauth_code_verifier');
    sessionStorage.removeItem('oauth_code_verifier_timestamp');
};

export const validateCSRFToken = (token: string): boolean => {
    const stored = sessionStorage.getItem('oauth_csrf_token');
    const timestamp = Number(sessionStorage.getItem('oauth_csrf_token_timestamp'));
    return !!stored && stored === token && !!timestamp && Date.now() - timestamp <= 600000;
};

export const clearCSRFToken = () => {
    sessionStorage.removeItem('oauth_csrf_token');
    sessionStorage.removeItem('oauth_csrf_token_timestamp');
};

const normaliseScopes = (value: string | undefined) => (value || 'trade').split(/[\s,]+/).filter(Boolean).join(' ');

/**
 * Starts Deriv OAuth with PKCE. The redirect URI is always the configured Vercel
 * value so the authorization and token requests cannot accidentally diverge.
 */
export const generateOAuthURL = async (prompt?: string) => {
    const environment = isProduction() ? 'production' : 'staging';
    const base = brandConfig?.platform.auth2_url?.[environment];
    const clientId = process.env.DERIV_OAUTH_CLIENT_ID;
    const redirectUrl = process.env.DERIV_REDIRECT_URL;
    const scopes = normaliseScopes(process.env.DERIV_OAUTH_SCOPE);
    const appId = process.env.DERIV_APP_ID;

    if (!base || !clientId || !redirectUrl) {
        console.error('Deriv OAuth is not configured');
        return '';
    }

    const state = generateCSRFToken();
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    sessionStorage.setItem('oauth_csrf_token', state);
    sessionStorage.setItem('oauth_csrf_token_timestamp', Date.now().toString());
    storeCodeVerifier(verifier);

    const params = new URLSearchParams({
        scope: scopes,
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUrl,
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
    });
    if (prompt) params.set('prompt', prompt);
    if (appId) params.set('app_id', appId);
    return `${base}auth?${params.toString()}`;
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'method_not_allowed', error_description: 'Use POST.' });
    }

    const clientId = process.env.DERIV_OAUTH_CLIENT_ID;
    const redirectUri = process.env.DERIV_REDIRECT_URL;
    const { code, code_verifier: codeVerifier } = req.body || {};

    if (!clientId || !redirectUri) {
        return res.status(500).json({
            error: 'server_configuration_error',
            error_description: 'DERIV_OAUTH_CLIENT_ID or DERIV_REDIRECT_URL is not configured.',
        });
    }

    if (!code || !codeVerifier) {
        return res.status(400).json({
            error: 'invalid_request',
            error_description: 'Authorization code or PKCE verifier is missing.',
        });
    }

    try {
        const upstream = await fetch('https://auth.deriv.com/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: clientId,
                code,
                code_verifier: codeVerifier,
                redirect_uri: redirectUri,
            }).toString(),
        });

        const data = await upstream.json();
        return res.status(upstream.status).json(data);
    } catch (error) {
        console.error('[OAuth] Deriv token exchange failed:', error);
        return res.status(502).json({
            error: 'upstream_error',
            error_description: 'Unable to reach Deriv OAuth token endpoint.',
        });
    }
}

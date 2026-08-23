const WebSocket = require('ws');

const ENDPOINT = 'wss://ws.binaryws.com/websockets/v3';
const MARKETS = [
    { symbol: '1HZ10V', display_name: 'Volatility 10 (1s) Index' },
    { symbol: '1HZ25V', display_name: 'Volatility 25 (1s) Index' },
    { symbol: '1HZ50V', display_name: 'Volatility 50 (1s) Index' },
    { symbol: '1HZ75V', display_name: 'Volatility 75 (1s) Index' },
    { symbol: '1HZ100V', display_name: 'Volatility 100 (1s) Index' },
    { symbol: 'R_10', display_name: 'Volatility 10 Index' },
    { symbol: 'R_25', display_name: 'Volatility 25 Index' },
    { symbol: 'R_50', display_name: 'Volatility 50 Index' },
    { symbol: 'R_75', display_name: 'Volatility 75 Index' },
    { symbol: 'R_100', display_name: 'Volatility 100 Index' },
];

function lastDigit(price) {
    const text = String(price);
    const decimal = text.includes('.') ? text.split('.')[1] : '';
    return Number((decimal || '0').slice(-1));
}

function scanLiveMarkets(scanType, barrier) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(ENDPOINT);
        const pending = new Map();
        const results = [];
        let settled = false;
        const timeout = setTimeout(() => finish(new Error('Deriv market scan timed out')), 25000);

        function finish(error) {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            try { ws.close(); } catch (_) {}
            if (error) reject(error);
            else resolve(results.sort((a, b) => b.confidence - a.confidence));
        }

        ws.on('open', () => {
            MARKETS.forEach((market, index) => {
                const reqId = index + 1;
                pending.set(reqId, market);
                ws.send(JSON.stringify({
                    ticks_history: market.symbol,
                    count: 200,
                    end: 'latest',
                    style: 'ticks',
                    subscribe: 0,
                    req_id: reqId,
                }));
            });
        });

        ws.on('message', raw => {
            let data;
            try { data = JSON.parse(raw.toString()); } catch (_) { return; }
            const reqId = data.req_id;
            if (!pending.has(reqId)) return;
            const market = pending.get(reqId);
            pending.delete(reqId);
            const prices = data.history && Array.isArray(data.history.prices) ? data.history.prices : [];
            const digits = prices.map(lastDigit).filter(digit => Number.isInteger(digit) && digit >= 0 && digit <= 9);
            if (digits.length) {
                const even = digits.filter(digit => digit % 2 === 0).length;
                const under = digits.filter(digit => digit <= barrier).length;
                const preferred = scanType === 'over_under' ? Math.max(under, digits.length - under) : Math.max(even, digits.length - even);
                results.push({
                    market: market.symbol,
                    display_name: market.display_name,
                    signal: scanType === 'over_under'
                        ? (under >= digits.length - under ? `UNDER ${barrier + 1}` : `OVER ${barrier}`)
                        : (even >= digits.length - even ? 'EVEN' : 'ODD'),
                    confidence: Number(((preferred / digits.length) * 100).toFixed(1)),
                    sample: digits.length,
                });
            }
            if (pending.size === 0) finish();
        });

        ws.on('error', error => finish(error));
        ws.on('close', () => {
            if (!settled) finish(new Error('Deriv WebSocket closed before the scan completed'));
        });
    });
}

module.exports = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const scanType = req.query.scan_type === 'over_under' ? 'over_under' : 'even_odd';
    const rawBarrier = Number(req.query.barrier);
    const barrier = [4, 5, 6].includes(rawBarrier) ? rawBarrier : 4;

    try {
        const results = await scanLiveMarkets(scanType, barrier);
        if (!results.length) throw new Error('No live tick history was returned');
        res.status(200).json({ results, source: 'live_deriv_market_feed' });
    } catch (error) {
        res.status(502).json({ error: error instanceof Error ? error.message : 'Live Deriv market scan failed' });
    }
};

import React, { useMemo, useState } from 'react';
import '../main/vintelfx-tabs.scss';
import './signal-ai.scss';

type ScanType = 'even_odd' | 'over_under';
type Market = { symbol: string; display_name: string };

type ScanResult = {
    market: string;
    display_name: string;
    signal: string;
    confidence: number;
    sample: number;
};

type DerivMessage = {
    msg_type?: string;
    error?: { message?: string };
    active_symbols?: Array<{ symbol: string; display_name: string }>;
    history?: { prices?: number[] };
};

const HISTORY_COUNT = 200;
const APP_ID = process.env.DERIV_APP_ID || '1089';
// The current public Options endpoint does not require an app ID or authentication.
// Keep legacy endpoints only as fallbacks for market-data compatibility.
const DERIV_ENDPOINTS = [
    'wss://api.derivws.com/trading/v1/options/ws/public',
    'wss://ws.binaryws.com/websockets/v3',
    `wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`,
];

const getLastDigit = (price: number) => {
    const text = String(price);
    const decimal = text.includes('.') ? text.split('.')[1] : '';
    return Number((decimal || '0').slice(-1));
};

const SignalAI = () => {
    const [scan_type, setScanType] = useState<ScanType>('even_odd');
    const [barrier, setBarrier] = useState(4);
    const [results, setResults] = useState<ScanResult[]>([]);
    const [status, setStatus] = useState('Ready to scan live market ticks.');
    const [is_scanning, setIsScanning] = useState(false);
    const strongest = useMemo(() => results[0], [results]);

    const handleScan = async () => {
        if (is_scanning) return;
        setIsScanning(true);
        setResults([]);
        setStatus('Connecting to live Deriv market data…');

        const runScan = (endpoint_index: number): Promise<ScanResult[]> => new Promise((resolve, reject) => {
            const endpoint = DERIV_ENDPOINTS[endpoint_index];
            const ws = new WebSocket(endpoint);
            let request_id = 0;
            let markets: Market[] = [];
            let next_index = 0;
            const scanned_results: ScanResult[] = [];
            let settled = false;
            const timeout = window.setTimeout(() => finish(new Error('Connection timed out')), 35000);

            const finish = (error?: Error) => {
                if (settled) return;
                settled = true;
                window.clearTimeout(timeout);
                if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close();
                if (error) reject(error);
                else resolve(scanned_results.sort((a, b) => b.confidence - a.confidence));
            };

            const requestNextMarket = () => {
                if (next_index >= markets.length) {
                    finish();
                    return;
                }
                const market = markets[next_index++];
                setStatus(`Scanning ${next_index} of ${markets.length}: ${market.display_name}…`);
                request_id += 1;
                ws.send(JSON.stringify({
                    ticks_history: market.symbol,
                    count: HISTORY_COUNT,
                    end: 'latest',
                    style: 'ticks',
                    req_id: request_id,
                }));
            };

            ws.onopen = () => {
                request_id = 1;
                setStatus('Connected. Loading live Volatility markets…');
                ws.send(JSON.stringify({ active_symbols: 'brief', product_type: 'basic', req_id: request_id }));
            };

            ws.onerror = () => finish(new Error('WebSocket connection failed'));

            ws.onmessage = event => {
                if (settled) return;
                let data: DerivMessage;
                try {
                    data = JSON.parse(event.data) as DerivMessage;
                } catch {
                    finish(new Error('Unreadable live response'));
                    return;
                }

                if (data.error) {
                    if (data.msg_type === 'history') {
                        requestNextMarket();
                        return;
                    }
                    finish(new Error(data.error.message || 'Deriv rejected the live request'));
                    return;
                }

                if (data.msg_type === 'active_symbols') {
                    markets = (data.active_symbols || [])
                        .filter(item => /Volatility/i.test(item.display_name) && /Index/i.test(item.display_name))
                        .map(item => ({ symbol: item.symbol, display_name: item.display_name }));
                    if (!markets.length) {
                        finish(new Error('No Volatility markets were returned'));
                        return;
                    }
                    setStatus(`Found ${markets.length} live Volatility markets. Starting analysis…`);
                    requestNextMarket();
                    return;
                }

                if (data.msg_type === 'history') {
                    const prices = data.history?.prices || [];
                    const digits = prices.map(getLastDigit).filter(digit => Number.isInteger(digit) && digit >= 0 && digit <= 9);
                    const market = markets[next_index - 1];
                    if (market && digits.length) {
                        const even_count = digits.filter(digit => digit % 2 === 0).length;
                        const under_count = digits.filter(digit => digit <= barrier).length;
                        const preferred_count = scan_type === 'even_odd'
                            ? Math.max(even_count, digits.length - even_count)
                            : Math.max(under_count, digits.length - under_count);
                        const signal = scan_type === 'even_odd'
                            ? (even_count >= digits.length - even_count ? 'EVEN' : 'ODD')
                            : (under_count >= digits.length - under_count ? `UNDER ${barrier + 1}` : `OVER ${barrier}`);
                        scanned_results.push({
                            market: market.symbol,
                            display_name: market.display_name,
                            signal,
                            confidence: Number(((preferred_count / digits.length) * 100).toFixed(1)),
                            sample: digits.length,
                        });
                    }
                    requestNextMarket();
                }
            };
        });

        try {
            let live_results: ScanResult[] = [];
            let last_error: unknown;
            for (let index = 0; index < DERIV_ENDPOINTS.length; index += 1) {
                try {
                    setStatus(index === 0 ? 'Connecting to the Deriv public market feed…' : 'Trying a compatible Deriv market feed…');
                    live_results = await runScan(index);
                    if (live_results.length) break;
                } catch (error) {
                    last_error = error;
                }
            }
            if (!live_results.length) throw last_error || new Error('No live market data was returned');
            setResults(live_results);
            setStatus(`Live scan complete: ${live_results.length} markets analysed from recent ticks.`);
        } catch (error) {
            const reason = error instanceof Error && error.message ? ` (${error.message})` : '';
            setStatus(`Could not connect to the live Deriv market feed. Please try again.${reason}`);
        } finally {
            setIsScanning(false);
        }
    };

    return <section className='signal-ai' aria-label='Signal AI'>
        <div className='signal-ai__header'><span className='signal-ai__icon'>🧠</span><div><h1>Signal AI</h1><p>Live Options signal analysis across Volatility markets.</p></div></div>
        <div className='signal-ai__controls'>
            <label><span>Signal type</span><select value={scan_type} disabled={is_scanning} onChange={event => setScanType(event.target.value as ScanType)}><option value='even_odd'>Odd / Even</option><option value='over_under'>Over / Under</option></select></label>
            {scan_type === 'over_under' && <label><span>Digit barrier</span><select value={barrier} disabled={is_scanning} onChange={event => setBarrier(Number(event.target.value))}><option value={4}>Under 5 / Over 4</option><option value={5}>Under 6 / Over 5</option><option value={6}>Under 7 / Over 6</option></select></label>}
            <button type='button' className='signal-ai__scan-button' onClick={handleScan} disabled={is_scanning}>{is_scanning ? 'Scanning…' : '🔎 Scan live markets'}</button>
        </div>
        <div className='signal-ai__status' role='status'>{is_scanning && <span className='signal-ai__spinner' />} {status}</div>
        {strongest && <div className='signal-ai__best'><div><span className='signal-ai__eyebrow'>STRONGEST CURRENT RESULT</span><h2>{strongest.display_name}</h2><p>{strongest.signal} · {strongest.confidence}% confidence</p></div><strong>{strongest.confidence}%</strong></div>}
        {!!results.length && <div className='signal-ai__results'>{results.map((result, index) => <article key={result.market} className='signal-ai__result'><span className='signal-ai__rank'>#{index + 1}</span><div><strong>{result.display_name}</strong><small>{result.sample} recent ticks analysed</small></div><div className='signal-ai__signal'>{result.signal}</div><b>{result.confidence}%</b></article>)}</div>}
        <div className='signal-ai__warning'><span>⚠️</span><p>Signal AI analyses recent live ticks statistically. A confidence percentage is not a prediction or guarantee that the next contract will win.</p></div>
    </section>;
};

export default SignalAI;

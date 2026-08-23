import React, { useEffect, useMemo, useRef, useState } from 'react';
import '../main/vintelfx-tabs.scss';
import './signal-ai.scss';

type ScanType = 'even_odd' | 'over_under';
type Market = { symbol: string; display_name: string };
type ScanResult = { market: string; display_name: string; signal: string; confidence: number; sample: number; last_digit: number };
type DerivMessage = { msg_type?: string; req_id?: number; error?: { message?: string }; history?: { prices?: Array<number | string> }; tick?: { symbol?: string; quote?: number | string } };

const HISTORY_COUNT = 200;
const DERIV_PUBLIC_ENDPOINT = 'wss://api.derivws.com/trading/v1/options/ws/public';
const MARKETS: Market[] = [
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

const getLastDigit = (price: number | string) => {
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
    const ws_ref = useRef<WebSocket | null>(null);
    const market_ticks_ref = useRef<Record<string, number[]>>({});
    const strongest = useMemo(() => results[0], [results]);

    useEffect(() => () => { if (ws_ref.current) { try { ws_ref.current.close(); } catch (_) {} ws_ref.current = null; } }, []);

    const buildResults = (ticksByMarket: Record<string, number[]>) => MARKETS.map(market => {
        const prices = (ticksByMarket[market.symbol] || []).slice(-HISTORY_COUNT);
        const digits = prices.map(getLastDigit).filter(digit => Number.isInteger(digit) && digit >= 0 && digit <= 9);
        if (!digits.length) return null;
        const even = digits.filter(digit => digit % 2 === 0).length;
        const under = digits.filter(digit => digit <= barrier).length;
        const preferred = scan_type === 'over_under' ? Math.max(under, digits.length - under) : Math.max(even, digits.length - even);
        const signal = scan_type === 'over_under' ? (under >= digits.length - under ? `UNDER ${barrier + 1}` : `OVER ${barrier}`) : (even >= digits.length - even ? 'EVEN' : 'ODD');
        return { market: market.symbol, display_name: market.display_name, signal, confidence: Number(((preferred / digits.length) * 100).toFixed(1)), sample: digits.length, last_digit: digits[digits.length - 1] } satisfies ScanResult;
    }).filter((result): result is ScanResult => Boolean(result)).sort((a, b) => b.confidence - a.confidence);

    const handleScan = () => {
        if (is_scanning) return;
        if (ws_ref.current) { try { ws_ref.current.close(); } catch (_) {} }
        setIsScanning(true); setResults([]); market_ticks_ref.current = {}; setStatus('Connecting to Deriv public live market data…');
        const ws = new WebSocket(DERIV_PUBLIC_ENDPOINT); ws_ref.current = ws;
        let received_history = 0; let settled = false; let next_request_id = 1; const request_market = new Map<number, Market>();
        const fail = (message: string) => { if (settled) return; settled = true; setIsScanning(false); setStatus(`Could not retrieve the live Deriv market analysis. Please try again. (${message})`); try { ws.close(); } catch (_) {} };
        const finish_initial_scan = () => { if (settled) return; settled = true; const initial = buildResults(market_ticks_ref.current); setResults(initial); setStatus(`LIVE · ${initial.length} Volatility markets analysed from ${HISTORY_COUNT} recent ticks. Streaming new ticks…`); setIsScanning(false); };
        ws.onopen = () => { setStatus('Connected to Deriv. Loading recent live ticks…'); MARKETS.forEach(market => { const req_id = next_request_id++; request_market.set(req_id, market); ws.send(JSON.stringify({ ticks_history: market.symbol, count: HISTORY_COUNT, end: 'latest', style: 'ticks', subscribe: 1, req_id })); }); };
        ws.onmessage = event => {
            let data: DerivMessage; try { data = JSON.parse(event.data) as DerivMessage; } catch (_) { return; }
            if (data.error) { fail(data.error.message || 'Deriv rejected the market-data request'); return; }
            if (data.msg_type === 'history' && data.req_id) { const market = request_market.get(data.req_id); if (!market) return; request_market.delete(data.req_id); const prices = data.history?.prices || []; market_ticks_ref.current[market.symbol] = prices.map(Number).filter(Number.isFinite).slice(-HISTORY_COUNT); received_history += 1; if (received_history === MARKETS.length) finish_initial_scan(); else setStatus(`LIVE · Loading market history ${received_history}/${MARKETS.length}…`); return; }
            if (data.msg_type === 'tick' && data.tick?.symbol && data.tick.quote !== undefined) { const symbol = data.tick.symbol; const quote = Number(data.tick.quote); if (!Number.isFinite(quote) || !MARKETS.some(market => market.symbol === symbol)) return; const current = market_ticks_ref.current[symbol] || []; market_ticks_ref.current[symbol] = [...current, quote].slice(-HISTORY_COUNT); setResults(buildResults(market_ticks_ref.current)); setStatus(`LIVE · Signal updated from the latest Deriv tick · ${new Date().toLocaleTimeString()}`); }
        };
        ws.onerror = () => fail('Live Deriv WebSocket connection failed'); ws.onclose = () => { if (!settled) fail('Live Deriv WebSocket closed unexpectedly'); }; window.setTimeout(() => { if (!settled) fail('Live market connection timed out'); }, 30000);
    };

    return <section className='signal-ai' aria-label='Signal AI'>
        <div className='signal-ai__controls'>
            <label><span>Signal type</span><select value={scan_type} disabled={is_scanning} onChange={event => setScanType(event.target.value as ScanType)}><option value='even_odd'>Odd / Even</option><option value='over_under'>Over / Under</option></select></label>
            {scan_type === 'over_under' && <label><span>Digit barrier</span><select value={barrier} disabled={is_scanning} onChange={event => setBarrier(Number(event.target.value))}><option value={4}>Under 5 / Over 4</option><option value={5}>Under 6 / Over 5</option><option value={6}>Under 7 / Over 6</option></select></label>}
            <button type='button' className='signal-ai__scan-button' onClick={handleScan} disabled={is_scanning}>{is_scanning ? 'Scanning live…' : '🔎 Scan live markets'}</button>
        </div>
        <div className='signal-ai__status' role='status'>{is_scanning && <span className='signal-ai__spinner' />} {status}</div>
        {strongest && <div className='signal-ai__best'><div><span className='signal-ai__eyebrow'>STRONGEST CURRENT RESULT</span><h2>{strongest.display_name}</h2><p>{strongest.signal} · {strongest.confidence}% confidence · latest digit {strongest.last_digit}</p></div><strong>{strongest.confidence}%</strong></div>}
        {!!results.length && <div className='signal-ai__results'>{results.map((result, index) => <article key={result.market} className='signal-ai__result'><span className='signal-ai__rank'>#{index + 1}</span><div><strong>{result.display_name}</strong><small>{result.sample} recent live ticks · latest digit {result.last_digit}</small></div><div className='signal-ai__signal'>{result.signal}</div><b>{result.confidence}%</b></article>)}</div>}
        <div className='signal-ai__warning'><span>⚠️</span><p>Signal AI analyses recent live ticks statistically. A confidence percentage is not a prediction or guarantee that the next contract will win.</p></div>
    </section>;
};

export default SignalAI;

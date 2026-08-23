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
    req_id?: number;
    error?: { message?: string };
    active_symbols?: Array<{ symbol: string; display_name: string; market?: string; submarket?: string }>;
    history?: { prices?: number[]; times?: number[] };
};

const HISTORY_COUNT = 200;
const APP_ID = process.env.DERIV_APP_ID || '1089';

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

        const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`);
        let request_id = 0;
        let markets: Market[] = [];
        let next_index = 0;
        const scanned_results: ScanResult[] = [];
        let timeout: number | undefined;

        const finish = (message: string) => {
            if (timeout) window.clearTimeout(timeout);
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close();
            scanned_results.sort((a, b) => b.confidence - a.confidence);
            setResults(scanned_results);
            setStatus(message);
            setIsScanning(false);
        };

        const requestNextMarket = () => {
            if (next_index >= markets.length) {
                finish(scanned_results.length ? `Live scan complete: ${scanned_results.length} markets analysed from recent ticks.` : 'No live Volatility tick history was returned. Please try again.');
                return;
            }
            const market = markets[next_index++];
            setStatus(`Scanning ${next_index} of ${markets.length}: ${market.display_name}…`);
            request_id += 1;
            ws.send(JSON.stringify({ ticks_history: market.symbol, count: HISTORY_COUNT, end: 'latest', style: 'ticks', req_id: request_id }));
        };

        timeout = window.setTimeout(() => finish('Live scan timed out before market data was returned. Please try again.'), 30000);

        ws.onopen = () => {
            request_id = 1;
            ws.send(JSON.stringify({ active_symbols: 'brief', product_type: 'basic', req_id: request_id }));
        };

        ws.onerror = () => finish('Could not connect to the live Deriv market feed. Please try again.');

        ws.onmessage = event => {
            let data: DerivMessage;
            try {
                data = JSON.parse(event.data) as DerivMessage;
            } catch {
                finish('Live market data returned an unreadable response. Please try again.');
                return;
            }

            if (data.error) {
                if (data.msg_type === 'active_symbols') finish(data.error.message || 'Could not retrieve the available live markets.');
                else requestNextMarket();
                return;
            }

            if (data.msg_type === 'active_symbols') {
                const available = data.active_symbols || [];
                markets = available
                    .filter(item => /Volatility/i.test(item.display_name) && /Index/i.test(item.display_name))
                    .map(item => ({ symbol: item.symbol, display_name: item.display_name }));
                if (!markets.length) {
                    finish('No supported Volatility markets were returned by the live feed.');
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
                    let signal: string;
                    let confidence: number;
                    if (scan_type === 'even_odd') {
                        const even = digits.filter(digit => digit % 2 === 0).length;
                        const odd = digits.length - even;
                        signal = even >= odd ? 'EVEN' : 'ODD';
                        confidence = (Math.max(even, odd) / digits.length) * 100;
                    } else {
                        const under = digits.filter(digit => digit < barrier + 1).length;
                        const over = digits.length - under;
                        signal = under >= over ? `UNDER ${barrier + 1}` : `OVER ${barrier}`;
                        confidence = (Math.max(under, over) / digits.length) * 100;
                    }
                    scanned_results.push({ market: market.symbol, display_name: market.display_name, signal, confidence: Number(confidence.toFixed(1)), sample: digits.length });
                }
                requestNextMarket();
            }
        };
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

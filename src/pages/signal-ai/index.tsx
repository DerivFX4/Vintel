import React, { useMemo, useState } from 'react';
import '../main/vintelfx-tabs.scss';
import './signal-ai.scss';

type ScanType = 'even_odd' | 'over_under';

type ScanResult = {
    market: string;
    display_name: string;
    signal: string;
    confidence: number;
    sample: number;
};

const MARKETS = [
    { symbol: '1HZ10V', display_name: 'Volatility 10 (1s)' },
    { symbol: '1HZ25V', display_name: 'Volatility 25 (1s)' },
    { symbol: '1HZ50V', display_name: 'Volatility 50 (1s)' },
    { symbol: '1HZ75V', display_name: 'Volatility 75 (1s)' },
    { symbol: '1HZ100V', display_name: 'Volatility 100 (1s)' },
    { symbol: 'R_10', display_name: 'Volatility 10' },
    { symbol: 'R_25', display_name: 'Volatility 25' },
    { symbol: 'R_50', display_name: 'Volatility 50' },
    { symbol: 'R_75', display_name: 'Volatility 75' },
    { symbol: 'R_100', display_name: 'Volatility 100' },
];

const HISTORY_COUNT = 200;
const APP_ID = process.env.DERIV_APP_ID || '1089';

const SignalAI = () => {
    const [scan_type, setScanType] = useState<ScanType>('even_odd');
    const [barrier, setBarrier] = useState(4);
    const [results, setResults] = useState<ScanResult[]>([]);
    const [status, setStatus] = useState('Ready to scan live market ticks.');
    const [is_scanning, setIsScanning] = useState(false);

    const strongest = useMemo(() => results[0], [results]);

    const scanMarket = (market: typeof MARKETS[number]) => new Promise<ScanResult>((resolve, reject) => {
        const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`);
        const timeout = window.setTimeout(() => { ws.close(); reject(new Error('Timed out')); }, 12000);
        ws.onopen = () => ws.send(JSON.stringify({ ticks_history: market.symbol, count: HISTORY_COUNT, end: 'latest', style: 'ticks' }));
        ws.onerror = () => { window.clearTimeout(timeout); reject(new Error('Connection failed')); };
        ws.onmessage = event => {
            try {
                const data = JSON.parse(event.data);
                if (data.error) throw new Error(data.error.message);
                const prices: number[] = data.history?.prices || [];
                const digits = prices.map(price => Math.abs(Math.round(Number(price) * 100) % 10));
                if (!digits.length) throw new Error('No ticks returned');
                let signal: string;
                let confidence: number;
                if (scan_type === 'even_odd') {
                    const even = digits.filter(digit => digit % 2 === 0).length;
                    const odd = digits.length - even;
                    signal = even >= odd ? 'EVEN' : 'ODD';
                    confidence = Math.max(even, odd) / digits.length * 100;
                } else {
                    const under = digits.filter(digit => digit <= barrier).length;
                    const over = digits.length - under;
                    signal = under >= over ? `UNDER ${barrier + 1}` : `OVER ${barrier}`;
                    confidence = Math.max(under, over) / digits.length * 100;
                }
                window.clearTimeout(timeout); ws.close();
                resolve({ market: market.symbol, display_name: market.display_name, signal, confidence: Number(confidence.toFixed(1)), sample: digits.length });
            } catch (error) {
                window.clearTimeout(timeout); ws.close(); reject(error);
            }
        };
    });

    const handleScan = async () => {
        setIsScanning(true); setResults([]); setStatus(`Scanning ${MARKETS.length} live markets…`);
        const scanned = await Promise.allSettled(MARKETS.map(scanMarket));
        const successful = scanned.filter((result): result is PromiseFulfilledResult<ScanResult> => result.status === 'fulfilled').map(result => result.value).sort((a, b) => b.confidence - a.confidence);
        setResults(successful);
        setStatus(successful.length ? `Live scan complete: ${successful.length} markets analysed from recent ticks.` : 'Scan could not retrieve market data. Please try again.');
        setIsScanning(false);
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

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

type ScanResponse = {
    results?: ScanResult[];
    error?: string;
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
        setStatus('Connecting to the live Deriv market feed…');

        try {
            const query = new URLSearchParams({
                scan_type,
                barrier: String(barrier),
            });
            const response = await fetch(`/api/signal-scan?${query.toString()}`, {
                headers: { Accept: 'application/json' },
                cache: 'no-store',
            });
            const data = await response.json() as ScanResponse;
            if (!response.ok || !data.results?.length) {
                throw new Error(data.error || 'No live market data was returned');
            }
            setResults(data.results);
            setStatus(`Live scan complete: ${data.results.length} markets analysed from recent Deriv ticks.`);
        } catch (error) {
            const reason = error instanceof Error && error.message ? ` (${error.message})` : '';
            setStatus(`Could not retrieve the live Deriv market analysis. Please try again.${reason}`);
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

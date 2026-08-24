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
    { symbol: '1HZ10V', display_name: 'Volatility 10 (1s) Index' }, { symbol: '1HZ25V', display_name: 'Volatility 25 (1s) Index' },
    { symbol: '1HZ50V', display_name: 'Volatility 50 (1s) Index' }, { symbol: '1HZ75V', display_name: 'Volatility 75 (1s) Index' },
    { symbol: '1HZ100V', display_name: 'Volatility 100 (1s) Index' }, { symbol: 'R_10', display_name: 'Volatility 10 Index' },
    { symbol: 'R_25', display_name: 'Volatility 25 Index' }, { symbol: 'R_50', display_name: 'Volatility 50 Index' },
    { symbol: 'R_75', display_name: 'Volatility 75 Index' }, { symbol: 'R_100', display_name: 'Volatility 100 Index' },
];
const getLastDigit = (price: number | string) => { const text = String(price); const decimal = text.includes('.') ? text.split('.')[1] : ''; return Number((decimal || '0').slice(-1)); };

const SignalAI = () => {
    const [scan_type, setScanType] = useState<ScanType>('even_odd'); const [barrier, setBarrier] = useState(4);
    const [results, setResults] = useState<ScanResult[]>([]); const [status, setStatus] = useState('Ready to scan live market ticks.');
    const [is_scanning, setIsScanning] = useState(false); const [is_loading_run, setIsLoadingRun] = useState(false);
    const [stake, setStake] = useState('0.5'); const [wins, setWins] = useState('4'); const [stop_loss, setStopLoss] = useState('50'); const [martingale, setMartingale] = useState('2');
    const ws_ref = useRef<WebSocket | null>(null); const market_ticks_ref = useRef<Record<string, number[]>>({});
    const shown_signal_counts_ref = useRef<Record<string, number>>({});
    const strongest = useMemo(() => results[0], [results]);
    useEffect(() => () => { try { ws_ref.current?.close(); } catch (_) {} }, []);

    // Build both sides for every market. When statistically equivalent/near-equivalent,
    // prefer the less recently shown side so one default signal cannot dominate scans.
    const buildResults = (ticksByMarket: Record<string, number[]>) => {
        const candidates: ScanResult[] = [];
        MARKETS.forEach(market => {
            const prices = (ticksByMarket[market.symbol] || []).slice(-HISTORY_COUNT);
            const digits = prices.map(getLastDigit).filter(d => Number.isInteger(d) && d >= 0 && d <= 9);
            if (!digits.length) return;

            const make = (signal: string, count: number) => candidates.push({
                market: market.symbol,
                display_name: market.display_name,
                signal,
                confidence: Number(((count / digits.length) * 100).toFixed(1)),
                sample: digits.length,
                last_digit: digits[digits.length - 1],
            });

            if (scan_type === 'over_under') {
                const under = digits.filter(d => d <= barrier).length;
                make(`UNDER ${barrier + 1}`, under);
                make(`OVER ${barrier}`, digits.length - under);
            } else {
                const even = digits.filter(d => d % 2 === 0).length;
                make('EVEN', even);
                make('ODD', digits.length - even);
            }
        });

        candidates.sort((a, b) => b.confidence - a.confidence);
        if (!candidates.length) return candidates;

        const bestConfidence = candidates[0].confidence;
        // Keep the market statistically competitive: only rebalance among signals within 1% of the best.
        const competitive = candidates.filter(candidate => bestConfidence - candidate.confidence <= 1);
        const counts = shown_signal_counts_ref.current;
        competitive.sort((a, b) => {
            const countDiff = (counts[a.signal] || 0) - (counts[b.signal] || 0);
            if (countDiff !== 0) return countDiff;
            return b.confidence - a.confidence;
        });

        const selected = competitive[0] || candidates[0];
        return [selected, ...candidates.filter(candidate => candidate !== selected)];
    };

    const rememberSelectedSignal = (scanResults: ScanResult[]) => {
        const selected = scanResults[0];
        if (selected) shown_signal_counts_ref.current[selected.signal] = (shown_signal_counts_ref.current[selected.signal] || 0) + 1;
    };

    const handleLoadAndRun = () => {
        if (!strongest || is_loading_run) return; const config = { stake: Math.max(0, Number(stake) || 0), stop_loss: Math.max(0, Number(stop_loss) || 0), wins: Math.max(1, Number(wins) || 1), martingale: Math.max(1, Number(martingale) || 1) };
        setIsLoadingRun(true); window.dispatchEvent(new CustomEvent('vintelfx-load-and-run-signal-bot', { detail: { result: strongest, config } }));
        setStatus(`Loading ${strongest.signal} with $${config.stake.toFixed(2)} stake, $${config.stop_loss} stop loss, ${config.wins}-win limit and ${config.martingale}× martingale…`); window.setTimeout(() => setIsLoadingRun(false), 3000);
    };
    const handleScan = () => {
        if (is_scanning) return; try { ws_ref.current?.close(); } catch (_) {} setIsScanning(true); setResults([]); market_ticks_ref.current = {}; setStatus('Connecting to Deriv public live market data…');
        const ws = new WebSocket(DERIV_PUBLIC_ENDPOINT); ws_ref.current = ws; let received_history = 0; let settled = false; let next_request_id = 1; const request_market = new Map<number, Market>();
        const fail = (message: string) => { if (settled) return; settled = true; setIsScanning(false); setStatus(`Could not retrieve the live Deriv market analysis. Please try again. (${message})`); try { ws.close(); } catch (_) {} };
        const finish = () => { if (settled) return; settled = true; const scanResults = buildResults(market_ticks_ref.current); setResults(scanResults); rememberSelectedSignal(scanResults); setStatus(`LIVE · ${MARKETS.length} Volatility markets analysed from ${HISTORY_COUNT} recent ticks. Showing the strongest balanced signal.`); setIsScanning(false); };
        ws.onopen = () => { setStatus('Connected to Deriv. Loading recent live ticks…'); MARKETS.forEach(market => { const req_id = next_request_id++; request_market.set(req_id, market); ws.send(JSON.stringify({ ticks_history: market.symbol, count: HISTORY_COUNT, end: 'latest', style: 'ticks', subscribe: 1, req_id })); }); };
        ws.onmessage = event => { let data: DerivMessage; try { data = JSON.parse(event.data) as DerivMessage; } catch (_) { return; } if (data.error) return fail(data.error.message || 'Deriv rejected the market-data request');
            if (data.msg_type === 'history' && data.req_id) { const market = request_market.get(data.req_id); if (!market) return; request_market.delete(data.req_id); market_ticks_ref.current[market.symbol] = (data.history?.prices || []).map(Number).filter(Number.isFinite).slice(-HISTORY_COUNT); received_history++; if (received_history === MARKETS.length) finish(); else setStatus(`LIVE · Loading market history ${received_history}/${MARKETS.length}…`); return; }
            if (data.msg_type === 'tick' && data.tick?.symbol && data.tick.quote !== undefined) { const symbol = data.tick.symbol; const quote = Number(data.tick.quote); if (!Number.isFinite(quote) || !MARKETS.some(m => m.symbol === symbol)) return; const current = market_ticks_ref.current[symbol] || []; market_ticks_ref.current[symbol] = [...current, quote].slice(-HISTORY_COUNT); const scanResults = buildResults(market_ticks_ref.current); setResults(scanResults); setStatus(`LIVE · Strongest signal updated from the latest Deriv tick · ${new Date().toLocaleTimeString()}`); }
        };
        ws.onerror = () => fail('Live Deriv WebSocket connection failed'); ws.onclose = () => { if (!settled) fail('Live Deriv WebSocket closed unexpectedly'); }; window.setTimeout(() => { if (!settled) fail('Live market connection timed out'); }, 30000);
    };
    const input = (label: string, value: string, setter: (v: string) => void, step: string, min: string) => <label className='signal-ai__param'><span>{label}</span><input type='number' value={value} min={min} step={step} onChange={e => setter(e.target.value)} disabled={!strongest || is_scanning || is_loading_run} /></label>;
    return <section className={`signal-ai ${strongest ? 'signal-ai--has-result' : ''}`} aria-label='Signal AI'>
        {!strongest && <div className='signal-ai__ready'>
            <div className='signal-ai__scan-orb-wrap'>
                <button type='button' className={`signal-ai__scan-orb ${is_scanning ? 'signal-ai__scan-orb--scanning' : ''}`} onClick={handleScan} disabled={is_scanning} aria-label='Scan live markets'>
                    <span className='signal-ai__scan-orb-title'>{is_scanning ? 'SCANNING' : 'SCAN'}</span>
                    <span className='signal-ai__scan-orb-copy'>{is_scanning ? 'Searching live markets…' : 'Tap scan to find an Even / Odd entry point.'}</span>
                </button>
            </div>
            <div className='signal-ai__pre-options'><label><span>Signal type</span><select value={scan_type} disabled={is_scanning} onChange={e => setScanType(e.target.value as ScanType)}><option value='even_odd'>Odd / Even</option><option value='over_under'>Over / Under</option></select></label>{scan_type === 'over_under' && <label><span>Digit barrier</span><select value={barrier} disabled={is_scanning} onChange={e => setBarrier(Number(e.target.value))}><option value={4}>Under 5 / Over 4</option><option value={5}>Under 6 / Over 5</option><option value={6}>Under 7 / Over 6</option></select></label>}</div>
            <div className='signal-ai__status' role='status'>{is_scanning && <span className='signal-ai__spinner' />} {status}</div>
        </div>}
        {strongest && <>
            <div className='signal-ai__result-top'>
                <h1>Signal AI</h1>
                <div className='signal-ai__switch' role='tablist' aria-label='Signal type'>
                    <button type='button' className={scan_type === 'over_under' ? 'is-active' : ''} disabled={is_scanning} onClick={() => setScanType('over_under')}>Over / Under</button>
                    <button type='button' className={scan_type === 'even_odd' ? 'is-active' : ''} disabled={is_scanning} onClick={() => setScanType('even_odd')}>Even / Odd</button>
                </div>
                <div className='signal-ai__market-card'>
                    <div className='signal-ai__market-head'><span className='signal-ai__eyebrow'>BEST MARKET</span><span className='signal-ai__trophy'>🏆</span></div>
                    <h2>{strongest.display_name}</h2>
                    <div className='signal-ai__result-row'><span>Market</span><strong>{strongest.display_name}</strong></div>
                    <div className='signal-ai__result-row'><span>Trade Type</span><strong className='signal-ai__signal-pill'>{strongest.signal}</strong></div>
                    <div className='signal-ai__result-row'><span>Win Rate</span><strong className='signal-ai__win-rate'>{strongest.confidence}%</strong></div>
                </div>
                <div className='signal-ai__live-status' role='status'>● {status}</div>
            </div>
            <div className='signal-ai__result-bottom'>
                <div className='signal-ai__config'>{input('Stake (USD)', stake, setStake, '0.01', '0')} {input('No. of Wins', wins, setWins, '1', '1')} {input('Stop Loss (USD)', stop_loss, setStopLoss, '0.01', '0')} {input('Martingale', martingale, setMartingale, '0.01', '1')}</div>
                <div className='signal-ai__result-actions'><button type='button' className='signal-ai__rescan' onClick={handleScan} disabled={is_scanning || is_loading_run}>↻ Rescan</button><button type='button' className='signal-ai__load-run' onClick={handleLoadAndRun} disabled={is_loading_run}>{is_loading_run ? 'Loading…' : '▶ Load & Run Bot'}</button></div>
            </div>
        </>}
        <p className='signal-ai__warning'>⚠️ Signal AI analyses recent live ticks statistically. A confidence percentage is not a prediction or guarantee that the next contract will win.</p>
    </section>;
};
export default SignalAI;

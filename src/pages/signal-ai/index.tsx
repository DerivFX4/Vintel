import React, { useEffect, useMemo, useRef, useState } from 'react';
import '../main/vintelfx-tabs.scss';
import './signal-ai.scss';

type ScanType = 'even_odd' | 'over_under';
type Market = { symbol: string; display_name: string };
type ScanResult = { market: string; display_name: string; signal: string; confidence: number; strength: number; agreement: number; sample: number; last_digit: number };
type DerivMessage = { msg_type?: string; req_id?: number; error?: { message?: string }; history?: { prices?: Array<number | string> } };

const HISTORY_COUNT = 500;
const MIN_STRENGTH = 60;
const MIN_SCAN_MS = 6000;
const FAIR_MARGIN = 1.5;
const DERIV_PUBLIC_ENDPOINT = 'wss://api.derivws.com/trading/v1/options/ws/public';
const WINDOWS = [{ size: 500, weight: 0.35 }, { size: 100, weight: 0.25 }, { size: 60, weight: 0.20 }, { size: 30, weight: 0.20 }] as const;
const MARKETS: Market[] = [
    { symbol: 'R_10', display_name: 'Volatility 10 Index' }, { symbol: '1HZ10V', display_name: 'Volatility 10 (1s) Index' },
    { symbol: '1HZ15V', display_name: 'Volatility 15 (1s) Index' }, { symbol: 'R_25', display_name: 'Volatility 25 Index' },
    { symbol: '1HZ25V', display_name: 'Volatility 25 (1s) Index' }, { symbol: 'R_50', display_name: 'Volatility 50 Index' },
    { symbol: '1HZ50V', display_name: 'Volatility 50 (1s) Index' }, { symbol: 'R_75', display_name: 'Volatility 75 Index' },
    { symbol: '1HZ75V', display_name: 'Volatility 75 (1s) Index' }, { symbol: 'R_100', display_name: 'Volatility 100 Index' },
    { symbol: '1HZ100V', display_name: 'Volatility 100 (1s) Index' },
];
const getLastDigit = (price: number | string) => { const text = String(price); const decimal = text.includes('.') ? text.split('.')[1] : ''; return Number((decimal || '0').slice(-1)); };
const getSignalTone = (signal: string) => signal === 'ODD' || signal.startsWith('UNDER') ? 'signal-ai__signal-pill--red' : 'signal-ai__signal-pill--green';

const SignalAI = () => {
    const [scan_type, setScanType] = useState<ScanType>('even_odd'); const [barrier, setBarrier] = useState(4);
    const [results, setResults] = useState<ScanResult[]>([]); const [status, setStatus] = useState('Ready to scan all Volatility markets.');
    const [is_scanning, setIsScanning] = useState(false); const [is_loading_run, setIsLoadingRun] = useState(false); const [scan_progress, setScanProgress] = useState(0);
    const [stake, setStake] = useState('0.5'); const [target_profit, setTargetProfit] = useState('10'); const [stop_loss, setStopLoss] = useState('50'); const [martingale, setMartingale] = useState('2');
    const ws_ref = useRef<WebSocket | null>(null); const market_ticks_ref = useRef<Record<string, number[]>>({}); const scan_active_ref = useRef(false); const scan_cycle_ref = useRef(0); const scan_timer_ref = useRef<number | null>(null); const scan_started_ref = useRef(0);
    const shown_signal_counts_ref = useRef<Record<string, number>>({});
    const strongest = useMemo(() => results[0], [results]);
    useEffect(() => () => { scan_active_ref.current = false; if (scan_timer_ref.current) window.clearInterval(scan_timer_ref.current); try { ws_ref.current?.close(); } catch (_) {} }, []);

    const buildResults = (ticksByMarket: Record<string, number[]>) => {
        const candidates: ScanResult[] = [];
        MARKETS.forEach(market => {
            const digits = (ticksByMarket[market.symbol] || []).slice(-HISTORY_COUNT).map(getLastDigit).filter(d => Number.isInteger(d) && d >= 0 && d <= 9);
            if (digits.length < 30) return;
            const leftSignal = scan_type === 'even_odd' ? 'EVEN' : `UNDER ${barrier + 1}`;
            const rightSignal = scan_type === 'even_odd' ? 'ODD' : `OVER ${barrier}`;
            [leftSignal, rightSignal].forEach(signal => {
                const isEvenOdd = scan_type === 'even_odd';
                const belongs = (digit: number) => isEvenOdd ? (signal === 'EVEN' ? digit % 2 === 0 : digit % 2 !== 0) : (signal === leftSignal ? digit <= barrier : digit > barrier);
                const sides = WINDOWS.map(({ size, weight }) => {
                    const sample = digits.slice(-size);
                    const count = sample.filter(belongs).length;
                    return { percentage: count / sample.length * 100, winner: count * 2 >= sample.length, weight };
                });
                const agreement = sides.filter(side => side.winner).length;
                const frequency = sides.reduce((total, side) => total + side.percentage * side.weight, 0);
                if (!isEvenOdd) {
                    const confidence = Math.min(100, Number((frequency * 0.7 + (agreement / 4) * 100 * 0.3).toFixed(1)));
                    if (agreement >= 3 && frequency >= MIN_STRENGTH) candidates.push({ market: market.symbol, display_name: market.display_name, signal, confidence, strength: Number(frequency.toFixed(1)), agreement, sample: digits.length, last_digit: digits[digits.length - 1] });
                    return;
                }

                const sidePercentages = sides.map(side => side.percentage);
                const minPercentage = Math.min(...sidePercentages);
                const maxPercentage = Math.max(...sidePercentages);
                const recentPercentage = sidePercentages[sidePercentages.length - 1];
                const longPercentage = sidePercentages[0];
                const edgeOverFair = frequency - 50;
                const windowRange = maxPercentage - minPercentage;
                const recentLongGap = Math.abs(recentPercentage - longPercentage);
                if (agreement < 4 || edgeOverFair < 5 || minPercentage < 53 || recentPercentage < 55 || recentLongGap > 8 || windowRange > 10) return;
                const stability = Math.max(0, Math.min(100, 100 - windowRange * 5));
                const strength = Math.min(100, frequency * 0.72 + stability * 0.28);
                const confidence = Math.min(100, Number((50 + edgeOverFair * 4 + (stability - 70) * 0.12).toFixed(1)));
                candidates.push({ market: market.symbol, display_name: market.display_name, signal, confidence, strength: Number(strength.toFixed(1)), agreement, sample: digits.length, last_digit: digits[digits.length - 1] });
            });
        });
        candidates.sort((a, b) => b.confidence - a.confidence || b.strength - a.strength);
        if (!candidates.length) return candidates;
        const best = candidates[0]; const competitive = candidates.filter(c => best.confidence - c.confidence <= FAIR_MARGIN && best.strength - c.strength <= FAIR_MARGIN);
        const counts = shown_signal_counts_ref.current;
        competitive.sort((a, b) => { const countDiff = (counts[a.signal] || 0) - (counts[b.signal] || 0); if (countDiff !== 0) return countDiff; if (scan_type === 'even_odd') { if (a.signal === 'EVEN' && b.signal === 'ODD') return -1; if (a.signal === 'ODD' && b.signal === 'EVEN') return 1; } return b.confidence - a.confidence || b.strength - a.strength; });
        const selected = competitive[0] || best; shown_signal_counts_ref.current[selected.signal] = (shown_signal_counts_ref.current[selected.signal] || 0) + 1;
        return [selected, ...candidates.filter(candidate => candidate !== selected)];
    };

    const handleLoadAndRun = () => { if (!strongest || is_loading_run) return; const config = { stake: Math.max(0, Number(stake) || 0), target_profit: Math.max(0.01, Number(target_profit) || 10), stop_loss: Math.max(0, Number(stop_loss) || 0), martingale: Math.max(1, Number(martingale) || 1) }; window.localStorage.setItem('vintelfx_signal_target_profit', String(config.target_profit)); window.localStorage.setItem('vintelfx_signal_current_profit', '0'); setIsLoadingRun(true); window.dispatchEvent(new CustomEvent('vintelfx-load-and-run-signal-bot', { detail: { result: strongest, config } })); setStatus(`Loading ${strongest.signal} with ${strongest.confidence}% confidence…`); window.setTimeout(() => setIsLoadingRun(false), 3000); };
    const stopScan = () => { scan_active_ref.current = false; scan_cycle_ref.current += 1; if (scan_timer_ref.current) { window.clearInterval(scan_timer_ref.current); scan_timer_ref.current = null; } try { ws_ref.current?.close(); } catch (_) {} ws_ref.current = null; setIsScanning(false); setScanProgress(0); setStatus('Scan stopped. Choose your signal settings and tap SCAN when ready.'); };
    const returnToMainScan = () => { stopScan(); setResults([]); setStatus('Ready to scan all Volatility markets.'); };
    const handleScan = () => {
        if (is_scanning) { stopScan(); return; } try { ws_ref.current?.close(); } catch (_) {} if (scan_timer_ref.current) window.clearInterval(scan_timer_ref.current);
        setIsScanning(true); setResults([]); setScanProgress(0); market_ticks_ref.current = {}; scan_active_ref.current = true; scan_cycle_ref.current = 1; scan_started_ref.current = Date.now();
        scan_timer_ref.current = window.setInterval(() => setScanProgress(previous => previous >= 100 ? 1 : previous + 1), 60);
        const startCycle = () => {
            if (!scan_active_ref.current) return; const cycle = scan_cycle_ref.current; let received = 0; let completed = false; const request_market = new Map<number, Market>(); let reqId = 1; market_ticks_ref.current = {}; setStatus(`Scanning ${MARKETS.length} Volatility markets · cycle ${cycle} · analysing 500/100/60/30 ticks…`);
            const ws = new WebSocket(DERIV_PUBLIC_ENDPOINT); ws_ref.current = ws;
            const finishCycle = () => { if (completed || !scan_active_ref.current) return; completed = true; const elapsed = Date.now() - scan_started_ref.current; const wait = Math.max(0, MIN_SCAN_MS - elapsed); window.setTimeout(() => { if (!scan_active_ref.current) return; const scanResults = buildResults(market_ticks_ref.current); if (scanResults.length) { if (scan_timer_ref.current) window.clearInterval(scan_timer_ref.current); setScanProgress(100); setResults(scanResults); const best = scanResults[0]; setStatus(`Best market found after scanning all markets · ${best.agreement}/4 agreement · ${best.strength}% strength · ${best.confidence}% confidence.`); setIsScanning(false); scan_active_ref.current = false; try { ws.close(); } catch (_) {} return; } scan_cycle_ref.current += 1; scan_started_ref.current = Date.now(); setScanProgress(0); setStatus(`No qualifying best market found. Rescanning all ${MARKETS.length} markets from 1%…`); try { ws.close(); } catch (_) {} window.setTimeout(startCycle, 80); }, wait); };
            ws.onopen = () => MARKETS.forEach(market => { const id = reqId++; request_market.set(id, market); ws.send(JSON.stringify({ ticks_history: market.symbol, count: HISTORY_COUNT, end: 'latest', style: 'ticks', req_id: id })); });
            ws.onmessage = event => { let data: DerivMessage; try { data = JSON.parse(event.data) as DerivMessage; } catch (_) { return; } if (data.msg_type === 'history' && data.req_id) { const market = request_market.get(data.req_id); if (!market) return; request_market.delete(data.req_id); market_ticks_ref.current[market.symbol] = (data.history?.prices || []).map(Number).filter(Number.isFinite).slice(-HISTORY_COUNT); received++; setStatus(`Scanning all Volatility markets · ${received}/${MARKETS.length} complete · cycle ${cycle}…`); if (received === MARKETS.length) finishCycle(); } };
            ws.onerror = () => { if (!completed && scan_active_ref.current) { completed = true; scan_active_ref.current = false; if (scan_timer_ref.current) window.clearInterval(scan_timer_ref.current); setIsScanning(false); setStatus('Live Deriv market connection failed. Please scan again.'); } };
        }; startCycle();
    };
    const input = (label: string, value: string, setter: (v: string) => void, step: string, min: string) => <label className='signal-ai__param'><span>{label}</span><input type='number' value={value} min={min} step={step} onChange={e => setter(e.target.value)} disabled={!strongest || is_scanning || is_loading_run} /></label>;
    return <section className={`signal-ai ${strongest ? 'signal-ai--has-result' : ''}`} aria-label='Signal AI'>
        {!strongest && <div className='signal-ai__ready'><div className='signal-ai__signal-selector' aria-label='Signal type'><div className='signal-ai__signal-title'>Signal Type</div><div className='signal-ai__switch signal-ai__switch--ready' role='tablist' aria-label='Signal type'><button type='button' className={scan_type === 'over_under' ? 'is-active' : ''} onClick={() => setScanType('over_under')} disabled={is_scanning}>Over / Under</button><button type='button' className={scan_type === 'even_odd' ? 'is-active' : ''} onClick={() => setScanType('even_odd')} disabled={is_scanning}>Even / Odd</button></div>{scan_type === 'over_under' && <label className='signal-ai__barrier-control'><span>Digit barrier</span><select value={barrier} disabled={is_scanning} onChange={e => setBarrier(Number(e.target.value))}><option value={4}>Under 5 / Over 4</option><option value={5}>Under 6 / Over 5</option><option value={6}>Under 7 / Over 6</option></select></label>}</div><div className='signal-ai__scan-orb-wrap'><button type='button' className={`signal-ai__scan-orb ${is_scanning ? 'signal-ai__scan-orb--scanning' : ''}`} onClick={handleScan} aria-label={is_scanning ? 'Stop scanning' : 'Scan live markets'}><span className='signal-ai__scan-orb-title'>{is_scanning ? 'SCANNING' : 'SCAN'}</span>{is_scanning && <span className='signal-ai__scan-orb-progress'>{scan_progress}%</span>}</button></div><div className='signal-ai__scan-copy'>{is_scanning ? `Scanning ${MARKETS.length} markets… ${scan_progress}%` : `Tap scan to find a ${scan_type === 'even_odd' ? 'Even / Odd' : 'Over / Under'} entry point.`}</div><div className='signal-ai__status' role='status'>{is_scanning && <span className='signal-ai__spinner' />} {status}</div></div>}
        {strongest && <><div className='signal-ai__result-top'><h1>Signal AI</h1><div className='signal-ai__switch' role='tablist' aria-label='Signal type'><button type='button' className={scan_type === 'over_under' ? 'is-active' : ''} onClick={() => setScanType('over_under')}>Over / Under</button><button type='button' className={scan_type === 'even_odd' ? 'is-active' : ''} onClick={() => setScanType('even_odd')}>Even / Odd</button></div><button type='button' className='signal-ai__rescan' onClick={returnToMainScan} disabled={is_loading_run}>↻ Rescan</button></div><div className='signal-ai__result-card'><div className='signal-ai__market'>{strongest.display_name}</div><div className={`signal-ai__signal-pill ${getSignalTone(strongest.signal)}`}>{strongest.signal}</div><div className='signal-ai__confidence'>{strongest.confidence}% <span>confidence</span></div><div className='signal-ai__metrics'><span>Strength <b>{strongest.strength}%</b></span><span>Windows <b>{strongest.agreement}/4</b></span><span>Last digit <b>{strongest.last_digit}</b></span></div></div><div className='signal-ai__params'><h2>Trade settings</h2><div className='signal-ai__params-grid'>{input('Stake', stake, setStake, '0.01', '0')}{input('Target profit', target_profit, setTargetProfit, '0.01', '0.01')}{input('Stop loss', stop_loss, setStopLoss, '0.01', '0')}{input('Martingale', martingale, setMartingale, '0.01', '1')}</div><button type='button' className='signal-ai__load-run' onClick={handleLoadAndRun} disabled={is_loading_run}>{is_loading_run ? 'Loading…' : 'Load & Run Bot'}</button></div><div className='signal-ai__status' role='status'>{status}</div></>}
    </section>;
};

export default SignalAI;

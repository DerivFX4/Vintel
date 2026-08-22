import { useCallback, useEffect, useRef, useState } from 'react';
import { buildSmartchartsChampionAdapter } from '@/adapters/smartcharts-champion';
import { createServices } from '@/adapters/smartcharts-champion/services';
import { createTransport } from '@/adapters/smartcharts-champion/transport';
import chart_api from '@/external/bot-skeleton/services/api/chart-api';
import { useApiBase } from '@/hooks/useApiBase';
import type { SmartchartsChampionAdapter } from '@/types/smartchart.types';
import type {
    ActiveSymbols,
    TGetQuotes,
    TGranularity,
    TradingTimesMap,
    TSubscribeQuotes,
    TUnsubscribeQuotes,
} from '@deriv-com/smartcharts-champion';

const logger = {
    log: () => {},
    warn: console.warn.bind(console, '[SmartCharts Hook]'),
    error: console.error.bind(console, '[SmartCharts Hook]'),
};

function isValidGranularity(value: unknown): value is TGranularity {
    const validGranularities = [0, 60, 120, 180, 300, 600, 900, 1800, 3600, 7200, 14400, 28800, 86400];
    return typeof value === 'number' && validGranularities.includes(value);
}

interface UseSmartChartAdaptorReturn {
    adapter: SmartchartsChampionAdapter | null;
    adapterInitialized: boolean;
    chartData: {
        activeSymbols: ActiveSymbols;
        tradingTimes: TradingTimesMap;
    };
    getQuotes: TGetQuotes;
    subscribeQuotes: TSubscribeQuotes;
    unsubscribeQuotes: TUnsubscribeQuotes;
    isLoading: boolean;
    error: Error | null;
}

export const useSmartChartAdaptor = (): UseSmartChartAdaptorReturn => {
    const { connectionStatus } = useApiBase();
    const [adapter, setAdapter] = useState<SmartchartsChampionAdapter | null>(null);
    const [adapterInitialized, setAdapterInitialized] = useState(false);
    const [chartData, setChartData] = useState<{
        activeSymbols: ActiveSymbols;
        tradingTimes: TradingTimesMap;
    }>({ activeSymbols: [] as ActiveSymbols, tradingTimes: {} as TradingTimesMap });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const isMountedRef = useRef(true);
    const cleanupFunctionsRef = useRef<Array<() => void>>([]);
    const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = null;
            }
        };
    }, []);

    // The chart API may not exist on the first render. Re-run initialization
    // when the shared Deriv connection opens so Charts cannot remain empty.
    useEffect(() => {
        if (adapterInitialized || !chart_api.api || connectionStatus !== 'opened') return;

        try {
            const transport = createTransport();
            const services = createServices();
            const championAdapter = buildSmartchartsChampionAdapter(transport, services, {
                debug: true,
                subscriptionTimeout: 30000,
            });

            if (isMountedRef.current) {
                setAdapter(championAdapter);
                setAdapterInitialized(true);
                setError(null);
            }
        } catch (err) {
            if (isMountedRef.current) {
                setError(err instanceof Error ? err : new Error('Failed to initialize chart adapter'));
                setIsLoading(false);
            }
        }
    }, [adapterInitialized, connectionStatus]);

    useEffect(() => {
        if (!adapter || !adapterInitialized) return;

        let cancelled = false;
        const loadChartData = async (retryCount = 0, maxRetries = 10, delayMs = 300) => {
            try {
                setIsLoading(true);
                const data = await adapter.getChartData();
                if (cancelled || !isMountedRef.current) return;

                if (data.activeSymbols.length === 0 && retryCount < maxRetries) {
                    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
                    retryTimeoutRef.current = setTimeout(
                        () => loadChartData(retryCount + 1, maxRetries, delayMs),
                        delayMs
                    );
                    return;
                }

                setChartData({ activeSymbols: data.activeSymbols, tradingTimes: data.tradingTimes });
                setError(null);
            } catch (err) {
                if (!cancelled && isMountedRef.current && retryCount < maxRetries) {
                    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
                    retryTimeoutRef.current = setTimeout(
                        () => loadChartData(retryCount + 1, maxRetries, delayMs),
                        delayMs
                    );
                    return;
                }
                if (!cancelled && isMountedRef.current) {
                    setError(err instanceof Error ? err : new Error('Failed to load chart data'));
                    setChartData({ activeSymbols: [] as ActiveSymbols, tradingTimes: {} as TradingTimesMap });
                }
            } finally {
                if (!cancelled && isMountedRef.current) setIsLoading(false);
            }
        };

        loadChartData();
        return () => {
            cancelled = true;
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = null;
            }
        };
    }, [adapter, adapterInitialized]);

    const getQuotes: TGetQuotes = useCallback(async params => {
        if (!adapter) throw new Error('Adapter not initialized');
        const result = await adapter.getQuotes({
            symbol: params.symbol,
            granularity: isValidGranularity(params.granularity) ? params.granularity : 0,
            count: params.count,
            start: params.start,
            end: params.end,
        });
        if (params.granularity === 0) {
            return {
                history: {
                    prices: result.quotes.map(q => q.Close),
                    times: result.quotes.map(q => parseInt(q.Date)),
                },
            };
        }
        return {
            candles: result.quotes.map(q => ({
                open: q.Open || q.Close,
                high: q.High || q.Close,
                low: q.Low || q.Close,
                close: q.Close,
                epoch: parseInt(q.Date),
            })),
        };
    }, [adapter]);

    const subscribeQuotes: TSubscribeQuotes = useCallback((params, callback) => {
        if (!adapter) return () => {};
        const unsubscribe = adapter.subscribeQuotes(
            {
                symbol: params.symbol,
                granularity: isValidGranularity(params.granularity) ? params.granularity : 0,
            },
            quote => {
                if (isMountedRef.current) callback(quote);
            }
        );
        const wrappedUnsubscribe = () => {
            unsubscribe();
            const index = cleanupFunctionsRef.current.indexOf(wrappedUnsubscribe);
            if (index > -1) cleanupFunctionsRef.current.splice(index, 1);
        };
        cleanupFunctionsRef.current.push(wrappedUnsubscribe);
        return wrappedUnsubscribe;
    }, [adapter]);

    const unsubscribeQuotes: TUnsubscribeQuotes = useCallback(request => {
        if (!adapter) return;
        if (request?.symbol && typeof request.granularity !== 'undefined') {
            adapter.unsubscribeQuotes({
                symbol: request.symbol,
                granularity: isValidGranularity(request.granularity) ? request.granularity : 0,
            });
        } else {
            adapter.transport.unsubscribeAll('ticks');
        }
    }, [adapter]);

    useEffect(() => () => {
        cleanupFunctionsRef.current.forEach(cleanup => {
            try { cleanup(); } catch (err) { logger.error('Error during cleanup:', err); }
        });
        cleanupFunctionsRef.current = [];
        try { chart_api.api?.forgetAll('ticks'); } catch (err) { logger.error('Error forgetting ticks:', err); }
        try { adapter?.transport?.unsubscribeAll('ticks'); } catch (err) { logger.error('Error unsubscribing from adapter:', err); }
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    }, [adapter]);

    return {
        adapter,
        adapterInitialized,
        chartData,
        getQuotes,
        subscribeQuotes,
        unsubscribeQuotes,
        isLoading,
        error,
    };
};

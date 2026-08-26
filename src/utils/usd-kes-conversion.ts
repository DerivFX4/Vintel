import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'vintelfx_display_currency';
const FALLBACK_USD_KES_RATE = 130;

export type DisplayCurrency = 'USD' | 'KES';

export const useDisplayCurrency = () => {
    const [displayCurrency, setDisplayCurrencyState] = useState<DisplayCurrency>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved === 'KES' ? 'KES' : 'USD';
    });
    const [usdKesRate, setUsdKesRate] = useState(FALLBACK_USD_KES_RATE);

    useEffect(() => {
        let cancelled = false;
        const loadRate = async () => {
            try {
                const response = await fetch('https://open.er-api.com/v6/latest/USD');
                const data = await response.json();
                const rate = Number(data?.rates?.KES);
                if (!cancelled && Number.isFinite(rate) && rate > 0) setUsdKesRate(rate);
            } catch {
                // Keep the last known/fallback rate so display conversion never breaks the trading UI.
            }
        };
        loadRate();
        return () => {
            cancelled = true;
        };
    }, []);

    const setDisplayCurrency = useCallback((currency: DisplayCurrency) => {
        localStorage.setItem(STORAGE_KEY, currency);
        setDisplayCurrencyState(currency);
    }, []);

    const convertUsdToKes = useCallback((value: number) => value * usdKesRate, [usdKesRate]);

    const formatAmount = useCallback(
        (value: number, sourceCurrency?: string) => {
            const amount = Number(value) || 0;
            if (displayCurrency === 'KES' && sourceCurrency === 'USD') {
                return `KSh ${convertUsdToKes(amount).toLocaleString('en-KE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                })}`;
            }
            return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${
                sourceCurrency || 'USD'
            }`;
        },
        [convertUsdToKes, displayCurrency]
    );

    return { displayCurrency, setDisplayCurrency, usdKesRate, convertUsdToKes, formatAmount };
};

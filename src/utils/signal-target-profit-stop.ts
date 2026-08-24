import { observer } from '@/external/bot-skeleton';

const TARGET_KEY = 'vintelfx_signal_target_profit';
const CURRENT_KEY = 'vintelfx_signal_current_profit';
const LAST_CONTRACT_KEY = 'vintelfx_signal_last_contract_id';
const STOPPED_KEY = 'vintelfx_signal_target_profit_reached';

const originalEmit = observer.emit.bind(observer);

observer.emit = ((event: string, data?: any, ...rest: any[]) => {
    if (event === 'contract.status' && data?.id === 'contract.sold') {
        const targetProfit = Number(window.localStorage.getItem(TARGET_KEY) || 0);
        const contract = data?.contract;
        const contractId = String(contract?.contract_id || contract?.id || '');
        const contractProfit = Number(contract?.profit);
        let currentProfit = Number(window.localStorage.getItem(CURRENT_KEY) || 0);
        let alreadyStopped = window.localStorage.getItem(STOPPED_KEY) === '1';

        // A new Signal AI run resets current profit to 0. Re-arm the stop guard here.
        if (alreadyStopped && currentProfit === 0) {
            window.localStorage.removeItem(STOPPED_KEY);
            window.localStorage.removeItem(LAST_CONTRACT_KEY);
            alreadyStopped = false;
        }

        const lastContractId = window.localStorage.getItem(LAST_CONTRACT_KEY) || '';

        if (
            targetProfit > 0 &&
            !alreadyStopped &&
            Number.isFinite(contractProfit) &&
            (!contractId || contractId !== lastContractId)
        ) {
            if (contractId) window.localStorage.setItem(LAST_CONTRACT_KEY, contractId);

            currentProfit += contractProfit;
            window.localStorage.setItem(CURRENT_KEY, String(currentProfit));

            if (currentProfit >= targetProfit) {
                window.localStorage.setItem(STOPPED_KEY, '1');

                originalEmit(event, data, ...rest);

                window.setTimeout(() => {
                    originalEmit('bot.click_stop');
                    window.dispatchEvent(
                        new CustomEvent('vintelfx-target-profit-reached', {
                            detail: { targetProfit, totalProfit: currentProfit },
                        })
                    );
                }, 0);

                return;
            }
        }
    }

    originalEmit(event, data, ...rest);
}) as typeof observer.emit;

import { observer } from '@/external/bot-skeleton';

const TARGET_KEY = 'vintelfx_signal_target_profit';
const CURRENT_KEY = 'vintelfx_signal_current_profit';
const LAST_CONTRACT_KEY = 'vintelfx_signal_last_contract_id';
const STOPPED_KEY = 'vintelfx_signal_target_profit_reached';

const originalEmit = observer.emit.bind(observer);

observer.emit = ((event: string, data?: any, ...rest: any[]) => {
    if (event === 'contract.status' && data?.id === 'contract.sold') {
        const targetProfit = Number(window.localStorage.getItem(TARGET_KEY) || 0);
        const alreadyStopped = window.localStorage.getItem(STOPPED_KEY) === '1';
        const contract = data?.contract;
        const contractId = String(contract?.contract_id || contract?.id || '');
        const lastContractId = window.localStorage.getItem(LAST_CONTRACT_KEY) || '';
        const contractProfit = Number(contract?.profit);

        if (
            targetProfit > 0 &&
            !alreadyStopped &&
            Number.isFinite(contractProfit) &&
            (!contractId || contractId !== lastContractId)
        ) {
            if (contractId) window.localStorage.setItem(LAST_CONTRACT_KEY, contractId);

            const currentProfit = Number(window.localStorage.getItem(CURRENT_KEY) || 0);
            const totalProfit = currentProfit + contractProfit;

            window.localStorage.setItem(CURRENT_KEY, String(totalProfit));

            if (totalProfit >= targetProfit) {
                window.localStorage.setItem(STOPPED_KEY, '1');
                window.localStorage.setItem('vintelfx_signal_current_profit', '0');

                originalEmit(event, data, ...rest);

                window.setTimeout(() => {
                    originalEmit('bot.click_stop');
                    window.dispatchEvent(
                        new CustomEvent('vintelfx-target-profit-reached', {
                            detail: { targetProfit, totalProfit },
                        })
                    );
                }, 0);

                return;
            }
        }
    }

    originalEmit(event, data, ...rest);
}) as typeof observer.emit;

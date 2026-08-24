import { observer } from '@/external/bot-skeleton';

const TARGET_KEY = 'vintelfx_signal_target_profit';
const CURRENT_KEY = 'vintelfx_signal_current_profit';
const LAST_CONTRACT_KEY = 'vintelfx_signal_last_contract_id';
const STOPPED_KEY = 'vintelfx_signal_target_profit_reached';
const OVERLAY_ID = 'vintelfx-target-profit-overlay';

const showTargetProfitOverlay = (targetProfit: number, totalProfit: number) => {
    document.getElementById(OVERLAY_ID)?.remove();

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.setAttribute('role', 'alert');
    overlay.innerHTML = `
        <div class="vintelfx-target-profit-card">
            <div class="vintelfx-target-profit-confetti">🎉🎉</div>
            <div class="vintelfx-target-profit-title">CONGRATULATIONS!</div>
            <div class="vintelfx-target-profit-message">VintelFX target profit hit 👐🏾</div>
            <div class="vintelfx-target-profit-value">Target: $${targetProfit.toFixed(2)} &nbsp;•&nbsp; Reached: $${totalProfit.toFixed(2)}</div>
        </div>
    `;

    Object.assign(overlay.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '2147483647',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'rgba(4, 10, 26, 0.76)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        textAlign: 'center',
    });

    const card = overlay.querySelector('.vintelfx-target-profit-card') as HTMLElement;
    Object.assign(card.style, {
        width: 'min(430px, 100%)',
        border: '2px solid #19c37d',
        borderRadius: '24px',
        padding: '32px 24px',
        background: '#101827',
        color: '#ffffff',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        fontFamily: 'inherit',
    });

    const confetti = overlay.querySelector('.vintelfx-target-profit-confetti') as HTMLElement;
    Object.assign(confetti.style, { fontSize: '42px', marginBottom: '12px' });

    const title = overlay.querySelector('.vintelfx-target-profit-title') as HTMLElement;
    Object.assign(title.style, { fontSize: '28px', fontWeight: '800', color: '#19c37d', letterSpacing: '0.5px' });

    const message = overlay.querySelector('.vintelfx-target-profit-message') as HTMLElement;
    Object.assign(message.style, { marginTop: '12px', fontSize: '19px', fontWeight: '700' });

    const value = overlay.querySelector('.vintelfx-target-profit-value') as HTMLElement;
    Object.assign(value.style, { marginTop: '18px', fontSize: '14px', opacity: '0.8' });

    overlay.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
};

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
                showTargetProfitOverlay(targetProfit, currentProfit);

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

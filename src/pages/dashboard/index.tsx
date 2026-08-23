import { observer } from 'mobx-react-lite';
import { useStore } from '../../hooks/useStore';
import './dashboard.scss';
import { useState } from 'react';

const RiskDisclaimer = () => {
    const [open, setOpen] = useState(false);

    if (!open) {
        return (
            <button
                type='button'
                aria-label='Open Risk Disclaimer'
                onClick={() => setOpen(true)}
                style={{
                    position: 'fixed', left: 0, bottom: '25vh', zIndex: 99999,
                    border: 0, borderRadius: '0 8px 8px 0', padding: '10px 14px',
                    background: '#f4c430', color: '#000', fontWeight: 700,
                    fontSize: '13px', boxShadow: '0 3px 12px rgba(0,0,0,.3)', cursor: 'pointer'
                }}
            >
                ⚠️ Risk Disclaimer
            </button>
        );
    }

    return (
        <div
            role='dialog'
            aria-label='Risk Disclaimer'
            onClick={() => setOpen(false)}
            style={{
                position: 'fixed', left: 0, bottom: '25vh', zIndex: 99999,
                width: 'min(75vw, 480px)', maxHeight: '60vh', overflowY: 'auto',
                boxSizing: 'border-box', padding: '14px', background: '#f4c430', color: '#000',
                borderRadius: '0 10px 10px 0', boxShadow: '0 4px 18px rgba(0,0,0,.35)',
                fontSize: '12px', lineHeight: 1.45, cursor: 'pointer'
            }}
        >
            <div onClick={event => event.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                    <strong style={{ fontSize: '14px' }}>⚠️ Risk Disclaimer</strong>
                    <button
                        type='button'
                        aria-label='Close Risk Disclaimer'
                        onClick={() => setOpen(false)}
                        style={{ border: 0, borderRadius: '50%', width: 28, height: 28, background: '#d32f2f', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
                    >✕</button>
                </div>
                <p>Deriv offers complex derivatives, such as options and contracts for difference (“CFDs”). These products may not be suitable for all clients, and trading them puts you at risk. Please make sure that you understand the following risks before trading Deriv products:</p>
                <ul>
                    <li>You may lose some or all of the money you invest in the trade.</li>
                    <li>If your trade involves currency conversion, exchange rates will affect your profit and loss.</li>
                </ul>
                <p>You should never trade with borrowed money or with money that you cannot afford to lose.</p>
            </div>
        </div>
    );
};

const Dashboard = observer(() => {
    const { ui } = useStore();
    const { isAuthorized } = ui;

    return (
        <main className='vintelfx-dashboard'>
            <div className='vintelfx-dashboard__content'>
                <div>Dashboard observing from mobx store.</div>
                <div>isAuthorized: {isAuthorized.toString()}</div>
            </div>
            <RiskDisclaimer />
        </main>
    );
});

export default Dashboard;

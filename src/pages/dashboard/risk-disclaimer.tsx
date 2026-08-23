import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './risk-disclaimer.scss';

const RiskDisclaimer = () => {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted) return null;

    const content = !open ? (
        <button type='button' className='risk-disclaimer__trigger' onClick={() => setOpen(true)}>
            ⚠️ Risk Disclaimer
        </button>
    ) : (
        <div className='risk-disclaimer__panel' role='dialog' aria-label='Risk Disclaimer' onClick={() => setOpen(false)}>
            <div className='risk-disclaimer__content'>
                <div className='risk-disclaimer__heading'>
                    <strong>⚠️ Risk Disclaimer</strong>
                    <button type='button' className='risk-disclaimer__close' aria-label='Close risk disclaimer' onClick={() => setOpen(false)}>
                        ✕
                    </button>
                </div>
                <div className='risk-disclaimer__text'>
                    <p>Deriv offers complex derivatives, such as options and contracts for difference (“CFDs”). These products may not be suitable for all clients, and trading them puts you at risk. Please make sure that you understand the following risks before trading Deriv products:</p>
                    <ul>
                        <li>You may lose some or all of the money you invest in the trade.</li>
                        <li>If your trade involves currency conversion, exchange rates will affect your profit and loss.</li>
                    </ul>
                    <p>You should never trade with borrowed money or with money that you cannot afford to lose.</p>
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
};

export default RiskDisclaimer;

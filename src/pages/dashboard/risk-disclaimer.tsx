import { useState } from 'react';
import './risk-disclaimer.scss';

const RiskDisclaimer = () => {
    const [open, setOpen] = useState(false);

    if (!open) {
        return (
            <button type='button' className='risk-disclaimer__trigger' onClick={() => setOpen(true)}>
                ⚠️ Risk Disclaimer
            </button>
        );
    }

    return (
        <div className='risk-disclaimer__panel' role='dialog' aria-label='Risk Disclaimer' onClick={() => setOpen(false)}>
            <div className='risk-disclaimer__content' onClick={event => event.stopPropagation()}>
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
};

export default RiskDisclaimer;

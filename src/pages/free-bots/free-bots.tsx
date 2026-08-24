import React from 'react';
import { useStore } from '@/hooks/useStore';
import './free-bots.scss';

type FreeBot = {
    id: string;
    name: string;
    description?: string;
    badge?: 'NEW' | 'UPDATED';
    status?: string;
    xml?: string;
    xml_url?: string;
};

const FREE_BOTS: FreeBot[] = [
    {
        id: 'differs-ov1-ov2-recovery-even',
        name: 'Differs, Ov1, Ov2 recovery EVEN',
        description: 'Sequence: Differs (0) → Over 1 → Over 2. After a loss, recovery trades EVEN repeatedly with Martingale ×2 until a recovery win, then the bot continues to the next sequence step. After Over 2 wins, the configured Volatility market can change and the sequence restarts at Differs (0). Default stake $0.35 · TP $5 · SL $20.',
        badge: 'NEW',
        status: 'Automated bot',
        xml_url: 'https://raw.githubusercontent.com/DerivFX4/Vintel/master/src/xml/Differs%20Ov1%20Ov2%20recovery%20EVEN.xml',
    },
    {
        id: 'vintel-even-bot',
        name: 'Vintel Even bot',
        description: 'Even digit bot · Volatility 25 (1s) · $1 stake · TP $5 · SL $10 · Martingale ×2 · resets after 2 wins.',
        badge: 'NEW',
        status: 'Free Bot',
        xml_url: 'https://raw.githubusercontent.com/DerivFX4/Vintel/master/src/xml/Vintel%20Even%20bot.xml',
    },
];

const FreeBots = () => {
    const { dashboard } = useStore();
    const [bots, setBots] = React.useState<FreeBot[]>(FREE_BOTS);
    const [loading_id, setLoadingId] = React.useState<string | null>(null);
    const [error, setError] = React.useState('');
    const file_input_ref = React.useRef<HTMLInputElement>(null);

    const uploadBot = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setError('');
        try {
            if (!file.name.toLowerCase().endsWith('.xml')) throw new Error('Please upload a valid XML bot file.');
            const xml = await file.text();
            if (!xml.trim().startsWith('<xml')) throw new Error('The uploaded file is not a valid Blockly XML workspace.');
            window.Blockly?.utils?.xml?.textToDom(xml);
            setBots(current => [{ id: `${file.name}-${Date.now()}`, name: file.name.replace(/\.xml$/i, ''), xml, description: 'Ready to configure in Bot Builder.', badge: 'NEW', status: 'Automated bot' }, ...current]);
        } catch (upload_error) {
            setError(upload_error instanceof Error ? upload_error.message : 'Unable to upload this bot.');
        }
    };

    const loadBot = async (bot: FreeBot) => {
        setError('');
        setLoadingId(bot.id);
        try {
            const xml = bot.xml ?? await (await fetch(bot.xml_url!)).text();
            if (!xml.trim().startsWith('<xml')) throw new Error('The bot file is not a valid Blockly XML workspace.');
            dashboard.setActiveTab(1);
            window.dispatchEvent(new CustomEvent('vintelfx-load-free-bot', { detail: { name: bot.name, xml } }));
        } catch (load_error) {
            setError(load_error instanceof Error ? load_error.message : 'Unable to load this bot.');
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <section className='free-bots-page'>
            <div className='free-bots-page__header'>
                <div><h2>🤖 Free Bots</h2><p>Upload XML bots. Every bot appears as a Free Bot card and loads into Bot Builder without starting trades.</p></div>
                <input ref={file_input_ref} className='free-bots-page__file-input' type='file' accept='.xml,application/xml,text/xml' onChange={uploadBot} />
                <button type='button' className='free-bots-page__upload-button' onClick={() => file_input_ref.current?.click()}>Upload XML Bot</button>
            </div>
            {error && <div className='free-bots-page__error'>{error}</div>}
            <div className='free-bots-page__list'>
                {bots.map(bot => (
                    <article className='free-bot-card' key={bot.id}>
                        <div className='free-bot-card__top'><div className='free-bot-card__icon' aria-hidden='true'>🤖</div><div className='free-bot-card__identity'><h3>{bot.name}</h3><span className='free-bot-card__status'>{bot.status || 'Automated bot'}</span></div>{bot.badge && <span className={`free-bot-card__badge free-bot-card__badge--${bot.badge.toLowerCase()}`}>{bot.badge}</span>}</div>
                        <div className='free-bot-card__body'><p>{bot.description || 'Ready to configure in Bot Builder.'}</p><div className='free-bot-card__meta'><span>XML Strategy</span><span>Ready to load</span></div></div>
                        <div className='free-bot-card__footer'><span className='free-bot-card__hint'>Load to configure and edit</span><button type='button' onClick={() => void loadBot(bot)} disabled={loading_id === bot.id}>{loading_id === bot.id ? 'Loading…' : 'Load'}</button></div>
                    </article>
                ))}
            </div>
        </section>
    );
};

export default FreeBots;    {
        id: 'under-7-recovery-even-v50',
        name: 'Under 7 Recovery EVEN',
        description: 'Trades Under 7 on Volatility 50. After a loss, the configured Quick Strategy Martingale recovery is used with EVEN recovery settings. Initial stake $0.50 · Martingale ×2 · TP $5 · SL $10 · 1 tick.',
        badge: 'NEW',
        status: 'Automated bot',
        xml_url: 'https://raw.githubusercontent.com/DerivFX4/Vintel/master/src/xml/Under%207%20Recovery%20EVEN.xml',
    },
    {
        id: 'vintel-even-bot',
        name: 'Vintel Even bot',
        description: 'Even digit bot · Volatility 25 (1s) · $1 stake · TP $5 · SL $10 · Martingale ×2 · resets after 2 wins.',
        badge: 'NEW',
        status: 'Free Bot',
        xml_url: 'https://raw.githubusercontent.com/DerivFX4/Vintel/master/src/xml/Vintel%20Even%20bot.xml',
    },
];

const FreeBots = () => {
    const { dashboard } = useStore();
    const [bots, setBots] = React.useState<FreeBot[]>(FREE_BOTS);
    const [loading_id, setLoadingId] = React.useState<string | null>(null);
    const [error, setError] = React.useState('');
    const file_input_ref = React.useRef<HTMLInputElement>(null);

    const uploadBot = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setError('');
        try {
            if (!file.name.toLowerCase().endsWith('.xml')) throw new Error('Please upload a valid XML bot file.');
            const xml = await file.text();
            if (!xml.trim().startsWith('<xml')) throw new Error('The uploaded file is not a valid Blockly XML workspace.');
            window.Blockly?.utils?.xml?.textToDom(xml);
            setBots(current => [{ id: `${file.name}-${Date.now()}`, name: file.name.replace(/\.xml$/i, ''), xml, description: 'Ready to configure in Bot Builder.', badge: 'NEW', status: 'Automated bot' }, ...current]);
        } catch (upload_error) {
            setError(upload_error instanceof Error ? upload_error.message : 'Unable to upload this bot.');
        }
    };

    const loadBot = async (bot: FreeBot) => {
        setError('');
        setLoadingId(bot.id);
        try {
            const xml = bot.xml ?? await (await fetch(bot.xml_url!)).text();
            if (!xml.trim().startsWith('<xml')) throw new Error('The bot file is not a valid Blockly XML workspace.');
            dashboard.setActiveTab(1);
            window.dispatchEvent(new CustomEvent('vintelfx-load-free-bot', { detail: { name: bot.name, xml } }));
        } catch (load_error) {
            setError(load_error instanceof Error ? load_error.message : 'Unable to load this bot.');
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <section className='free-bots-page'>
            <div className='free-bots-page__header'>
                <div><h2>🤖 Free Bots</h2><p>Upload XML bots. Every bot appears as a Free Bot card and loads into Bot Builder without starting trades.</p></div>
                <input ref={file_input_ref} className='free-bots-page__file-input' type='file' accept='.xml,application/xml,text/xml' onChange={uploadBot} />
                <button type='button' className='free-bots-page__upload-button' onClick={() => file_input_ref.current?.click()}>Upload XML Bot</button>
            </div>
            {error && <div className='free-bots-page__error'>{error}</div>}
            <div className='free-bots-page__list'>
                {bots.map(bot => (
                    <article className='free-bot-card' key={bot.id}>
                        <div className='free-bot-card__top'><div className='free-bot-card__icon' aria-hidden='true'>🤖</div><div className='free-bot-card__identity'><h3>{bot.name}</h3><span className='free-bot-card__status'>{bot.status || 'Automated bot'}</span></div>{bot.badge && <span className={`free-bot-card__badge free-bot-card__badge--${bot.badge.toLowerCase()}`}>{bot.badge}</span>}</div>
                        <div className='free-bot-card__body'><p>{bot.description || 'Ready to configure in Bot Builder.'}</p><div className='free-bot-card__meta'><span>XML Strategy</span><span>Ready to load</span></div></div>
                        <div className='free-bot-card__footer'><span className='free-bot-card__hint'>Load to configure and edit</span><button type='button' onClick={() => void loadBot(bot)} disabled={loading_id === bot.id}>{loading_id === bot.id ? 'Loading…' : 'Load'}</button></div>
                    </article>
                ))}
            </div>
        </section>
    );
};

export default FreeBots;

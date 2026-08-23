import React from 'react';
import { useStore } from '@/hooks/useStore';
import './free-bots.scss';

type FreeBot = {
    id: string;
    name: string;
    description?: string;
    badge?: 'NEW' | 'UPDATED';
    xml: string;
};

const FreeBots = () => {
    const { dashboard } = useStore();
    const [bots, setBots] = React.useState<FreeBot[]>([]);
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

            const id = `${file.name}-${Date.now()}`;
            const name = file.name.replace(/\.xml$/i, '');
            setBots(current => [{ id, name, xml, description: 'Ready to configure in Bot Builder.', badge: 'NEW' }, ...current]);
        } catch (upload_error) {
            console.error('[VintelFX] Free bot upload failed:', upload_error);
            setError(upload_error instanceof Error ? upload_error.message : 'Unable to upload this bot.');
        }
    };

    const loadBot = async (bot: FreeBot) => {
        setError('');
        setLoadingId(bot.id);
        try {
            // Switch first so the Blockly workspace exists, then let QuickStrategyStore
            // load the XML into that existing Bot Builder workspace. This never runs trades.
            dashboard.setActiveTab(1);
            window.dispatchEvent(new CustomEvent('vintelfx-load-free-bot', { detail: { name: bot.name, xml: bot.xml } }));
        } catch (load_error) {
            console.error('[VintelFX] Free bot load failed:', load_error);
            setError(load_error instanceof Error ? load_error.message : 'Unable to load this bot.');
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <section className='free-bots-page'>
            <div className='free-bots-page__header'>
                <div>
                    <h2>🤖 Free Bots</h2>
                    <p>Upload XML bots. Every bot is automatically presented as a Free Bot card and can be loaded into Bot Builder without starting trades.</p>
                </div>
                <input ref={file_input_ref} className='free-bots-page__file-input' type='file' accept='.xml,application/xml,text/xml' onChange={uploadBot} />
                <button type='button' className='free-bots-page__upload-button' onClick={() => file_input_ref.current?.click()}>Upload XML Bot</button>
            </div>

            {error && <div className='free-bots-page__error'>{error}</div>}

            <div className='free-bots-page__list'>
                {bots.map(bot => (
                    <article className='free-bot-card' key={bot.id}>
                        <div className='free-bot-card__top'>
                            <div className='free-bot-card__icon' aria-hidden='true'>🤖</div>
                            <div className='free-bot-card__identity'>
                                <h3>{bot.name}</h3>
                                <span className='free-bot-card__status'>Free Bot</span>
                            </div>
                            {bot.badge && <span className={`free-bot-card__badge free-bot-card__badge--${bot.badge.toLowerCase()}`}>{bot.badge}</span>}
                        </div>
                        <div className='free-bot-card__body'>
                            <p>{bot.description || 'Ready to configure in Bot Builder.'}</p>
                            <div className='free-bot-card__meta'><span>XML Strategy</span><span>Ready to load</span></div>
                        </div>
                        <div className='free-bot-card__footer'>
                            <span className='free-bot-card__hint'>Load to configure and edit</span>
                            <button type='button' onClick={() => void loadBot(bot)} disabled={loading_id === bot.id}>{loading_id === bot.id ? 'Loading…' : 'Load'}</button>
                        </div>
                    </article>
                ))}
                {bots.length === 0 && <div className='free-bots-page__empty'>No XML bots uploaded yet.</div>}
            </div>
        </section>
    );
};

export default FreeBots;

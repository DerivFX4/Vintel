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

            const id = `${file.name}-${Date.now()}`;
            const name = file.name.replace(/\.xml$/i, '');
            setBots(current => [{ id, name, xml, badge: 'NEW' }, ...current]);
        } catch (upload_error) {
            console.error('[VintelFX] Free bot upload failed:', upload_error);
            setError(upload_error instanceof Error ? upload_error.message : 'Unable to upload this bot.');
        }
    };

    const loadBot = async (bot: FreeBot) => {
        setError('');
        setLoadingId(bot.id);
        try {
            // QuickStrategyStore owns this event and sends the XML through the same
            // Blockly `load()` pipeline used by Quick Strategy. It only loads the bot;
            // it deliberately does not trigger the Run panel.
            window.dispatchEvent(new CustomEvent('vintelfx-load-free-bot', { detail: { name: bot.name, xml: bot.xml } }));
            dashboard.setActiveTab(1);
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
                    <p>Upload XML bots here. Tap Load to configure the bot in Bot Builder; loading never starts trading automatically.</p>
                </div>
                <input ref={file_input_ref} className='free-bots-page__file-input' type='file' accept='.xml,application/xml,text/xml' onChange={uploadBot} />
                <button type='button' className='free-bots-page__upload-button' onClick={() => file_input_ref.current?.click()}>
                    Upload XML Bot
                </button>
            </div>

            {error && <div className='free-bots-page__error'>{error}</div>}

            <div className='free-bots-page__list'>
                {bots.map(bot => (
                    <article className='free-bot-card' key={bot.id}>
                        {bot.badge && <span className={`free-bot-card__badge free-bot-card__badge--${bot.badge.toLowerCase()}`}>{bot.badge} ✦</span>}
                        <h3>{bot.name}</h3>
                        {bot.description && <p>{bot.description}</p>}
                        <button type='button' onClick={() => void loadBot(bot)} disabled={loading_id === bot.id}>
                            {loading_id === bot.id ? 'Loading…' : 'Load'}
                        </button>
                    </article>
                ))}
                {bots.length === 0 && <div className='free-bots-page__empty'>No XML bots uploaded yet.</div>}
            </div>
        </section>
    );
};

export default FreeBots;

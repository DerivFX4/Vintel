import React from 'react';
import { useStore } from '@/hooks/useStore';
import './free-bots.scss';

type FreeBot = {
    id: string;
    name: string;
    description?: string;
    badge?: 'NEW' | 'UPDATED';
    xml_url: string;
};

// New XML uploads are inserted at the top so the newest bot appears first.
const FREE_BOTS: FreeBot[] = [
    {
        id: 'utt-taichi-under-ladder-ldp-dbot',
        name: 'UTT_TaiChi_Under_Ladder__LDP DBot',
        xml_url: 'https://raw.githubusercontent.com/DerivFX4/Vintel/master/src/xml/UTT_TaiChi_Under_Ladder__LDP%20DBot.xml',
    },
];

const FreeBots = () => {
    const { dashboard } = useStore();
    const [loading_id, setLoadingId] = React.useState<string | null>(null);
    const [error, setError] = React.useState('');

    const loadBot = async (bot: FreeBot) => {
        setError('');
        setLoadingId(bot.id);
        try {
            const response = await fetch(bot.xml_url);
            if (!response.ok) throw new Error(`Unable to load ${bot.name}`);
            const xml = await response.text();
            if (!xml.trim().startsWith('<xml')) throw new Error('The bot file is not a valid XML workspace.');

            window.dispatchEvent(new CustomEvent('vintelfx-load-free-bot', { detail: { name: bot.name, xml } }));
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
                    <p>XML bots added to the Free Bots library appear here. The newest uploaded bot is shown first.</p>
                </div>
            </div>

            {error && <div className='free-bots-page__error'>{error}</div>}

            <div className='free-bots-page__list'>
                {FREE_BOTS.map(bot => (
                    <article className='free-bot-card' key={bot.id}>
                        {bot.badge && <span className={`free-bot-card__badge free-bot-card__badge--${bot.badge.toLowerCase()}`}>{bot.badge} ✦</span>}
                        <h3>{bot.name}</h3>
                        {bot.description && <p>{bot.description}</p>}
                        <button type='button' onClick={() => loadBot(bot)} disabled={loading_id === bot.id}>
                            {loading_id === bot.id ? 'Loading…' : 'Load Bot'}
                        </button>
                    </article>
                ))}
            </div>
        </section>
    );
};

export default FreeBots;

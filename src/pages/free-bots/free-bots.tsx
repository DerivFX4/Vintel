import React from 'react';
import { useStore } from '@/hooks/useStore';
import './free-bots.scss';

type FreeBot = {
    id: string;
    name: string;
    description: string;
    badge?: 'NEW' | 'UPDATED';
    xml_url: string;
};

// New bots are added to the top of this list so the newest card always appears first.
const FREE_BOTS: FreeBot[] = [
    {
        id: 'martingale',
        name: 'Martingale',
        description: 'A ready-to-load Martingale strategy. Configure the bot in Bot Builder, then use the existing Run control at the bottom to start it.',
        badge: 'NEW',
        xml_url: 'https://raw.githubusercontent.com/DerivFX4/Vintel/master/src/xml/martingale.xml',
    },
    {
        id: 'dalembert',
        name: "D’Alembert",
        description: 'A ready-to-load D’Alembert strategy. After loading, its blocks remain fully editable in Bot Builder before you run it.',
        xml_url: 'https://raw.githubusercontent.com/DerivFX4/Vintel/master/src/xml/dalembert.xml',
    },
    {
        id: 'oscars-grind',
        name: "Oscar’s Grind",
        description: 'A ready-to-load Oscar’s Grind strategy that opens directly in the existing Bot Builder workspace.',
        badge: 'UPDATED',
        xml_url: 'https://raw.githubusercontent.com/DerivFX4/Vintel/master/src/xml/oscars_grind.xml',
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

            // Store the XML before switching tabs. Bot Builder consumes this payload when its workspace is visible.
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
                    <p>Load a bot into Bot Builder, review or edit it, then use the existing Run button at the bottom.</p>
                </div>
            </div>

            <div className='free-bots-page__subtabs' aria-label='Free Bots sections'>
                <span className='free-bots-page__subtab free-bots-page__subtab--active'>Free Bots</span>
                <span className='free-bots-page__subtab'>Bots Store</span>
                <span className='free-bots-page__subtab'>Risk Calculator</span>
            </div>

            {error && <div className='free-bots-page__error'>{error}</div>}

            <div className='free-bots-page__list'>
                {FREE_BOTS.map(bot => (
                    <article className='free-bot-card' key={bot.id}>
                        {bot.badge && <span className={`free-bot-card__badge free-bot-card__badge--${bot.badge.toLowerCase()}`}>{bot.badge} ✦</span>}
                        <h3>{bot.name}</h3>
                        <p>{bot.description}</p>
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

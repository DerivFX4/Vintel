import React, { useState } from 'react';
import './deriv-course.scss';

type TLesson = {
    icon: string;
    title: string;
    summary: string;
    sections: Array<{ heading: string; paragraphs: string[] }>;
};

const lessons: TLesson[] = [
    {
        icon: '🎓', title: 'Introduction', summary: 'Understand Deriv Options, contract basics, stake, payout, profit and loss.',
        sections: [
            { heading: 'What are Options?', paragraphs: ['An Options trade is a contract based on a prediction about market behaviour over a chosen period or number of ticks.', 'Before trading, understand the contract type, stake, duration, possible payout and conditions that determine whether a contract wins or loses.'] },
            { heading: 'Stake, payout and profit', paragraphs: ['💰 Stake is the amount committed to the contract. 📈 Payout is the amount received when a contract settles successfully. Profit is the result after comparing payout with stake.', '⚠️ A winning payout does not make every future trade profitable. Each contract should be evaluated independently.'] },
        ],
    },
    {
        icon: '🌐', title: 'Markets', summary: 'Learn Synthetic Indices, Volatility Indices and how market behaviour can affect Options trading.',
        sections: [
            { heading: 'Synthetic and volatility markets', paragraphs: ['Synthetic Indices are designed to simulate market movement and include different volatility levels and tick speeds.', 'Higher volatility can produce larger and faster movements. Choose a market only after understanding its behaviour and the contract you intend to use.'] },
            { heading: 'Choosing a market', paragraphs: ['Compare movement, tick speed and your strategy requirements. Practice on a demo account before increasing risk.', '📌 A market being volatile does not automatically mean it is better for every Options strategy.'] },
        ],
    },
    {
        icon: '📈', title: 'Rise/Fall', summary: 'Predict whether the exit spot will finish higher or lower than the entry spot.',
        sections: [
            { heading: 'Rise', paragraphs: ['📈 A Rise contract predicts that the exit spot will finish higher than the entry spot according to the contract conditions.', 'Consider direction, duration and market movement before entering.'] },
            { heading: 'Fall', paragraphs: ['📉 A Fall contract predicts that the exit spot will finish lower than the entry spot.', '💡 Trends can change. A visible trend is analysis information, not a guarantee of the next result.'] },
        ],
    },
    {
        icon: '↕️', title: 'Higher/Lower', summary: 'Understand barriers and contracts that finish above or below a selected level.',
        sections: [
            { heading: 'Understanding barriers', paragraphs: ['A barrier is a reference level used by applicable contracts. The settlement result depends on where the market finishes relative to that level and the contract rules.', '📌 Barrier distance, duration and volatility can materially affect the contract.'] },
        ],
    },
    {
        icon: '🎯', title: 'Touch/No Touch', summary: 'Learn how barriers, distance and duration affect Touch and No Touch contracts.',
        sections: [
            { heading: 'Touch', paragraphs: ['🎯 A Touch contract requires the market to reach the relevant barrier under the contract conditions.', 'Barrier distance and market volatility influence the likelihood of a touch.'] },
            { heading: 'No Touch', paragraphs: ['🛡️ A No Touch contract requires the relevant barrier not to be reached during the contract period, subject to the contract rules.', '⚠️ Fast movement can change conditions quickly, especially when the barrier is close.'] },
        ],
    },
    {
        icon: '🔢', title: 'Digits', summary: 'Explore Matches/Differs, Even/Odd and Over/Under contracts.',
        sections: [
            { heading: 'What is digit trading?', paragraphs: ['🔢 Digit contracts use the last digit of a market tick as part of the contract outcome. Depending on the contract, the prediction may concern a specific digit or a digit group.', 'Common groups include Matches/Differs, Even/Odd and Over/Under. Always read the exact contract conditions before purchasing.'] },
            { heading: 'Even/Odd', paragraphs: ['Even contracts concern the digits 0, 2, 4, 6 and 8. Odd contracts concern 1, 3, 5, 7 and 9.', '🧠 Recent Even or Odd frequency can be counted, but historical frequency does not guarantee the next tick.'] },
            { heading: 'Matches/Differs', paragraphs: ['Matches predicts a selected digit according to the contract conditions. Differs predicts a result different from the selected digit.', '📌 Check the selected barrier or digit and the displayed payout before trading.'] },
            { heading: 'Over/Under', paragraphs: ['Over and Under contracts compare the final digit with a selected barrier digit.', 'The barrier changes the set of possible qualifying digits, so it must be considered carefully.'] },
            { heading: 'Risk warning', paragraphs: ['⚠️ A digit sequence is not a promise about the next result. Avoid increasing stake simply because a digit has not appeared recently.', 'Use fixed risk limits and practice with a demo account first.'] },
        ],
    },
    {
        icon: '🧠', title: 'Digit Analysis', summary: 'Read recent tick digits and understand frequency, probability and statistical noise.',
        sections: [
            { heading: 'Frequency analysis', paragraphs: ['Count recent digits and calculate how frequently each digit or group has appeared within a defined sample.', '🧮 Even versus Odd percentages can be calculated from the observed sample, but the percentage describes that sample rather than guaranteeing the next tick.'] },
            { heading: 'Statistical noise', paragraphs: ['Short samples can create misleading patterns. Increase sample awareness and avoid treating a temporary streak as certainty.', '💡 Use analysis as information and combine it with disciplined risk management.'] },
        ],
    },
    {
        icon: '📊', title: 'Chart Analysis', summary: 'Learn trends, support, resistance, candles, moving averages and RSI.',
        sections: [
            { heading: 'Reading direction', paragraphs: ['📊 Charts can help identify uptrends, downtrends and sideways movement. Support and resistance may identify areas where price has previously reacted.', 'Technical indicators are analytical tools, not guaranteed prediction engines.'] },
            { heading: 'Confirmation', paragraphs: ['Use more than one piece of information when appropriate and avoid forcing a trade when conditions are unclear.', '📌 Always consider contract duration as well as the chart timeframe you are analysing.'] },
        ],
    },
    {
        icon: '📈', title: 'Strategies', summary: 'Study educational Options strategies and how to test them safely on a demo account.',
        sections: [
            { heading: 'Strategy testing', paragraphs: ['A strategy should define its market, contract type, entry conditions, duration and risk limits before it is tested.', '🧪 Test ideas on a demo account and record results over a meaningful sample.'] },
            { heading: 'No guaranteed strategy', paragraphs: ['⚠️ A strategy can experience losing periods even when it has worked previously. Do not assume a high past win rate guarantees future results.'] },
        ],
    },
    {
        icon: '💰', title: 'Money Management', summary: 'Set stake limits, take-profit goals and controlled recovery rules.',
        sections: [
            { heading: 'Protecting capital', paragraphs: ['💰 Decide the maximum amount you are prepared to risk before starting a session. Keep individual stakes proportionate to the account and your personal limits.', '📌 Define take-profit and stop conditions before emotions influence the decision.'] },
            { heading: 'Recovery methods', paragraphs: ['Martingale and recovery systems can increase losses rapidly during losing streaks. A progression should never be treated as a guarantee of recovery.', 'Use limited, tested rules or fixed staking where appropriate.'] },
        ],
    },
    {
        icon: '🛡️', title: 'Risk Management', summary: 'Use loss limits, avoid overtrading and understand why no strategy guarantees profit.',
        sections: [
            { heading: 'Risk limits', paragraphs: ['🛡️ Set a maximum session loss and stop when it is reached. A stop rule is designed to protect the account when conditions are unfavourable.', 'Avoid revenge trading, chasing losses and increasing exposure without a planned reason.'] },
        ],
    },
    {
        icon: '🧘', title: 'Trading Psychology', summary: 'Manage fear, greed, FOMO, revenge trading and overconfidence.',
        sections: [
            { heading: 'Emotional discipline', paragraphs: ['🧘 Fear can cause early exits while greed can encourage excessive risk. FOMO can cause trades without a valid plan.', 'A trading journal can help identify emotional patterns and improve discipline.'] },
        ],
    },
    {
        icon: '🤖', title: 'Bot Basics', summary: 'Learn automated Options trading, entry conditions, trade conditions and stop rules.',
        sections: [
            { heading: 'Automation basics', paragraphs: ['🤖 A trading bot follows programmed rules. Before automation, clearly define entry conditions, contract parameters, stake rules and stop conditions.', '⚠️ Automation does not remove market risk. A flawed rule can repeat a flawed decision quickly.'] },
        ],
    },
    {
        icon: '🧩', title: 'Build a Bot', summary: 'Build an educational Even/Odd, Over/Under or Rise/Fall bot step by step.',
        sections: [
            { heading: 'Plan before building', paragraphs: ['🧩 Start with the market and contract type, then define when the bot may trade, how much it may stake and when it must stop.', 'Test every condition on demo before relying on the automation.'] },
        ],
    },
    {
        icon: '🧠', title: 'Signal Analysis', summary: 'Understand market scanning and confidence scores as informational probabilities, not guarantees.',
        sections: [
            { heading: 'Reading a signal', paragraphs: ['🧠 A signal or confidence score can summarise an analysis of selected data. It is not a promise of the next market result.', '📌 Higher historical confidence does not remove the possibility of a losing trade.'] },
        ],
    },
    {
        icon: '🚀', title: 'Advanced Trading', summary: 'Compare markets, test strategies and measure performance before increasing risk.',
        sections: [
            { heading: 'Performance review', paragraphs: ['🚀 Compare strategy performance across meaningful samples, including wins, losses, drawdowns and changing market conditions.', 'Increase risk only after considering whether performance is robust and whether the loss limits remain acceptable.'] },
        ],
    },
    {
        icon: '🏆', title: 'Final Quiz', summary: 'Test your understanding of Deriv Options concepts and responsible trading.',
        sections: [
            { heading: 'Check your understanding', paragraphs: ['🏆 Review what stake, payout, duration, ticks and barriers mean. Confirm that you understand the risks of digit analysis, strategies and automated trading.', 'The most important answer is that no historical analysis or strategy can guarantee a future contract result.'] },
        ],
    },
];

const DerivCourse = () => {
    const [activeLesson, setActiveLesson] = useState<number | null>(null);
    const lesson = activeLesson === null ? null : lessons[activeLesson];

    if (lesson) {
        return (
            <div className='deriv-course deriv-course--lesson-view'>
                <button className='deriv-course__back' onClick={() => setActiveLesson(null)} type='button' aria-label='Back to Deriv Course contents'>
                    🔙 <span>Back to Deriv Course</span>
                </button>
                <article className='deriv-course__reading'>
                    <header className='deriv-course__reading-header'>
                        <span className='deriv-course__reading-icon'>{lesson.icon}</span>
                        <div><h1>{lesson.title}</h1><p>{lesson.summary}</p></div>
                    </header>
                    {lesson.sections.map(section => (
                        <section className='deriv-course__section' key={section.heading}>
                            <h2>{section.heading}</h2>
                            {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                        </section>
                    ))}
                    <section className='deriv-course__key-point'>
                        <span>📌</span>
                        <div><strong>Key point</strong><p>Practice first, use responsible risk limits, and never treat historical results as a guarantee of future outcomes.</p></div>
                    </section>
                </article>
            </div>
        );
    }

    return (
        <div className='deriv-course'>
            <section className='deriv-course__hero'>
                <span className='deriv-course__hero-icon'>🎓</span>
                <div><h1>Deriv Options Course</h1><p>Learn Options trading from beginner to advanced level.</p></div>
            </section>
            <section className='deriv-course__notice'><span>⚠️</span><p>Trading involves risk. Course examples are educational and do not guarantee profits or winning trades.</p></section>
            <nav className='deriv-course__contents' aria-label='Deriv Options course contents'>
                {lessons.map((item, index) => (
                    <button className='deriv-course__lesson' key={item.title} onClick={() => setActiveLesson(index)} type='button'>
                        <span className='deriv-course__lesson-icon'>{item.icon}</span>
                        <span className='deriv-course__lesson-copy'><strong>{index + 1}. {item.title}</strong><small>{item.summary}</small></span>
                        <span className='deriv-course__lesson-arrow'>›</span>
                    </button>
                ))}
            </nav>
        </div>
    );
};

export default DerivCourse;

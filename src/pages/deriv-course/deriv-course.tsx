import React, { useState } from 'react';
import './deriv-course.scss';

const lessons = [
    ['🎓', 'Introduction', 'Understand Deriv Options, contract basics, stake, payout, profit and loss.'],
    ['🌐', 'Markets', 'Learn Synthetic Indices, Volatility Indices and how market behaviour can affect Options trading.'],
    ['📈', 'Rise/Fall', 'Predict whether the exit spot will finish higher or lower than the entry spot.'],
    ['↕️', 'Higher/Lower', 'Understand barriers and contracts that finish above or below a selected level.'],
    ['🎯', 'Touch/No Touch', 'Learn how barriers, distance and duration affect Touch and No Touch contracts.'],
    ['🔢', 'Digits', 'Explore Matches/Differs, Even/Odd and Over/Under contracts.'],
    ['🧠', 'Digit Analysis', 'Read recent tick digits and understand frequency, probability and statistical noise.'],
    ['📊', 'Chart Analysis', 'Learn trends, support, resistance, candles, moving averages and RSI.'],
    ['📈', 'Strategies', 'Study educational Options strategies and how to test them safely on a demo account.'],
    ['💰', 'Money Management', 'Set stake limits, take-profit goals and controlled recovery rules.'],
    ['🛡️', 'Risk Management', 'Use loss limits, avoid overtrading and understand why no strategy guarantees profit.'],
    ['🧘', 'Trading Psychology', 'Manage fear, greed, FOMO, revenge trading and overconfidence.'],
    ['🤖', 'Bot Basics', 'Learn automated Options trading, entry conditions, trade conditions and stop rules.'],
    ['🧩', 'Build a Bot', 'Build an educational Even/Odd, Over/Under or Rise/Fall bot step by step.'],
    ['🧠', 'Signal Analysis', 'Understand market scanning and confidence scores as informational probabilities, not guarantees.'],
    ['🚀', 'Advanced Trading', 'Compare markets, test strategies and measure performance before increasing risk.'],
    ['🏆', 'Final Quiz', 'Test your understanding of Deriv Options concepts and responsible trading.'],
];

const DerivCourse = () => {
    const [activeLesson, setActiveLesson] = useState(0);
    const lesson = lessons[activeLesson];

    return (
        <div className='deriv-course'>
            <section className='deriv-course__hero'>
                <span className='deriv-course__hero-icon'>🎓</span>
                <div>
                    <h1>Deriv Options Course</h1>
                    <p>Learn Options trading from beginner to advanced level.</p>
                </div>
            </section>

            <section className='deriv-course__notice'>
                <span>⚠️</span>
                <p>Trading involves risk. Course examples are educational and do not guarantee profits or winning trades.</p>
            </section>

            <div className='deriv-course__layout'>
                <nav className='deriv-course__lessons' aria-label='Deriv Options course lessons'>
                    {lessons.map(([icon, title], index) => (
                        <button key={title} className={activeLesson === index ? 'deriv-course__lesson deriv-course__lesson--active' : 'deriv-course__lesson'} onClick={() => setActiveLesson(index)} type='button'>
                            <span>{icon}</span><span>{index + 1}. {title}</span>
                        </button>
                    ))}
                </nav>

                <article className='deriv-course__content'>
                    <div className='deriv-course__content-icon'>{lesson[0]}</div>
                    <h2>{lesson[1]}</h2>
                    <p>{lesson[2]}</p>
                    <div className='deriv-course__key-point'>
                        <span>📌</span>
                        <div><strong>Key point</strong><p>Practice first, use responsible risk limits, and never treat historical results as a guarantee of future outcomes.</p></div>
                    </div>
                    <div className='deriv-course__actions'>
                        <button type='button' disabled={activeLesson === 0} onClick={() => setActiveLesson(value => value - 1)}>← Previous</button>
                        <span>{activeLesson + 1} / {lessons.length}</span>
                        <button type='button' disabled={activeLesson === lessons.length - 1} onClick={() => setActiveLesson(value => value + 1)}>Next →</button>
                    </div>
                </article>
            </div>
        </div>
    );
};

export default DerivCourse;

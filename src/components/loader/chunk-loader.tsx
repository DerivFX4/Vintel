import { useEffect, useState } from 'react';
import './chunk-loader.scss';
import './chunk-loader-fix.scss';

const MINIMUM_LOADER_DURATION = 8000;

export default function ChunkLoader({ message: _message }: { message?: string }) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const startedAt = performance.now();
        let frame = 0;

        const update = (now: number) => {
            const elapsed = Math.min(now - startedAt, MINIMUM_LOADER_DURATION);
            const ratio = elapsed / MINIMUM_LOADER_DURATION;
            // Ease-out progress keeps the animation smooth and avoids a fast chunk-loading feel.
            const eased = 1 - Math.pow(1 - ratio, 2);
            setProgress(Math.min(100, Math.round(eased * 100)));

            if (elapsed < MINIMUM_LOADER_DURATION) {
                frame = window.requestAnimationFrame(update);
            }
        };

        frame = window.requestAnimationFrame(update);
        return () => window.cancelAnimationFrame(frame);
    }, []);

    return (
        <main className='vintelfx-chunk-loader' aria-live='polite' aria-label='Loading VintelFX'>
            <section className='vintelfx-chunk-loader__content'>
                <h1 className='vintelfx-chunk-loader__brand'>
                    Vintel<span className='vintelfx-chunk-loader__brand-fx'>FX</span>
                </h1>

                <p className='vintelfx-chunk-loader__subtitle'>
                    Your Ultimate trusted Deriv third-party website
                </p>

                <div className='vintelfx-chunk-loader__progress-wrap'>
                    <div
                        className='vintelfx-chunk-loader__progress'
                        role='progressbar'
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progress}
                    >
                        <div
                            className='vintelfx-chunk-loader__progress-fill'
                            style={{ transform: `scaleX(${progress / 100})` }}
                        />
                    </div>
                    <div className='vintelfx-chunk-loader__percent'>{progress}%</div>
                </div>

                <p className='vintelfx-chunk-loader__tagline'>
                    Automate your trades with trading bots
                </p>
            </section>
        </main>
    );
}

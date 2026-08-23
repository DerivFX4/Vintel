import { useEffect, useState } from 'react';
import './chunk-loader.scss';

export default function ChunkLoader({ message: _message }: { message?: string }) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const duration = 7200;
        const startedAt = Date.now();
        let timer = 0;

        const update = () => {
            const next = Math.min(100, Math.floor(((Date.now() - startedAt) / duration) * 100));
            setProgress(next);
            if (next < 100) timer = window.setTimeout(update, 72);
        };

        update();
        return () => window.clearTimeout(timer);
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
                        <div className='vintelfx-chunk-loader__progress-fill' />
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

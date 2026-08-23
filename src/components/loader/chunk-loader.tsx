import { useEffect, useState } from 'react';
import './chunk-loader.scss';
import './chunk-loader-fix.scss';

type ChunkLoaderProps = {
    message?: string;
    isExiting?: boolean;
};

export default function ChunkLoader({ message: _message, isExiting = false }: ChunkLoaderProps) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const duration = 8000;
        const startedAt = Date.now();
        let frame = 0;

        const update = () => {
            const elapsed = Date.now() - startedAt;
            const next = Math.min(100, Math.round((elapsed / duration) * 100));
            setProgress(next);
            if (next < 100) frame = window.requestAnimationFrame(update);
        };

        update();
        return () => window.cancelAnimationFrame(frame);
    }, []);

    return (
        <main
            className={`vintelfx-chunk-loader${isExiting ? ' vintelfx-chunk-loader--exit' : ''}`}
            aria-live='polite'
            aria-label='Loading VintelFX'
        >
            <section className='vintelfx-chunk-loader__content'>
                <h1 className='vintelfx-chunk-loader__brand'>
                    Vintel<span className='vintelfx-chunk-loader__brand-fx'>FX</span>
                </h1>

                <p className='vintelfx-chunk-loader__subtitle'>
                    Your Ultimate trusted Deriv third party website
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

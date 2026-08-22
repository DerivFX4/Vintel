import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';
import { pluginBasicSsl } from '@rsbuild/plugin-basic-ssl';

const path = require('path');

const derivOAuthClientId = process.env.Deriv_OAuth_Client_id || process.env.CLIENT_ID;
const derivAppId = process.env.Deriv_app_id || process.env.APP_ID;
const derivRedirectUrl = process.env.Deriv_redirect_url;
const derivOAuthScope = process.env.Deriv_AOuth_scope;

export default defineConfig({
    plugins: [
        pluginSass({
            sassLoaderOptions: { sourceMap: true, sassOptions: {} },
            exclude: /node_modules/,
        }),
        pluginReact(),
        pluginBasicSsl(),
    ],
    source: {
        entry: { index: './src/main.tsx' },
        define: {
            'process.env': {
                APP_ENV: JSON.stringify(process.env.APP_ENV),
                // Exact Vercel variables used by VintelFX.
                Deriv_OAuth_Client_id: JSON.stringify(derivOAuthClientId),
                Deriv_app_id: JSON.stringify(derivAppId),
                Deriv_redirect_url: JSON.stringify(derivRedirectUrl),
                Deriv_AOuth_scope: JSON.stringify(derivOAuthScope),
                // Backwards-compatible aliases for existing Deriv application code.
                CLIENT_ID: JSON.stringify(derivOAuthClientId),
                APP_ID: JSON.stringify(derivAppId),
                GD_CLIENT_ID: JSON.stringify(process.env.GD_CLIENT_ID),
                GD_APP_ID: JSON.stringify(process.env.GD_APP_ID),
                GD_API_KEY: JSON.stringify(process.env.GD_API_KEY),
            },
        },
        alias: {
            react: path.resolve('./node_modules/react'),
            'react-dom': path.resolve('./node_modules/react-dom'),
            '@/external': path.resolve(__dirname, './src/external'),
            '@/components': path.resolve(__dirname, './src/components'),
            '@/hooks': path.resolve(__dirname, './src/hooks'),
            '@/utils': path.resolve(__dirname, './src/utils'),
            '@/constants': path.resolve(__dirname, './src/constants'),
            '@/stores': path.resolve(__dirname, './src/stores'),
        },
    },
    output: {
        copy: [
            { from: 'node_modules/@deriv-com/smartcharts-champion/dist/*', to: 'js/smartcharts/[name][ext]', globOptions: { ignore: ['**/*.LICENSE.txt'] } },
            { from: 'node_modules/@deriv-com/smartcharts-champion/dist/assets/*', to: 'assets/[name][ext]' },
            { from: 'node_modules/@deriv-com/smartcharts-champion/dist/assets/fonts/*', to: 'assets/fonts/[name][ext]' },
            { from: 'node_modules/@deriv-com/smartcharts-champion/dist/assets/shaders/*', to: 'assets/shaders/[name][ext]' },
            { from: path.join(__dirname, 'public') },
        ],
    },
    html: { template: './index.html' },
    server: { port: 8443, compress: true },
    dev: { hmr: true },
    performance: {
        bundleAnalyze: process.env.BUNDLE_ANALYZE === 'true' ? { analyzerMode: 'server', analyzerHost: 'localhost', analyzerPort: 8888, openAnalyzer: true, generateStatsFile: true, statsFilename: 'stats.json' } : undefined,
    },
    tools: {
        rspack: {
            plugins: [], resolve: {},
            module: { rules: [{ test: /\.xml$/, exclude: /node_modules/, use: 'raw-loader' }] },
        },
    },
});

/* [AI] - Analytics removed - utility functions moved to @/utils/account-helpers */
import { getAccountId, getAccountType, isDemoAccount, removeUrlParameter } from '@/utils/account-helpers';
/* [/AI] */
import CommonStore from '@/stores/common-store';
import { DerivWSAccountsService } from '@/services/derivws-accounts.service';
import { TAuthData } from '@/types/api-types';
import { clearAuthData } from '@/utils/auth-utils';
import { handleBackendError, isBackendError } from '@/utils/error-handler';
import { activeSymbolsProcessorService } from '../../../../services/active-symbols-processor.service';
import { observer as globalObserver } from '../../utils/observer';
import { doUntilDone, socket_state } from '../tradeEngine/utils/helpers';
import {
    CONNECTION_STATUS,
    setAccountList,
    setAuthData,
    setConnectionStatus,
    setIsAuthorized,
    setIsAuthorizing,
} from './observables/connection-status-stream';
import ApiHelpers from './api-helpers';
import { generateDerivApiInstance, V2GetActiveAccountId } from './appId';
import chart_api from './chart-api';

type CurrentSubscription = { id: string; unsubscribe: () => void; };
type SubscriptionPromise = Promise<{ subscription: CurrentSubscription; }>;
type TApiBaseApi = {
    connection: { readyState: keyof typeof socket_state; addEventListener: (event: string, callback: () => void) => void; removeEventListener: (event: string, callback: () => void) => void; };
    send: (data: unknown) => void;
    disconnect: () => void;
    authorize: (token: string) => Promise<{ authorize: TAuthData; error: unknown }>;
    onMessage: () => { subscribe: (callback: (message: unknown) => void) => { unsubscribe: () => void; }; };
} & ReturnType<typeof generateDerivApiInstance>;

class APIBase {
    api: TApiBaseApi | null = null; token = ''; account_id = ''; pip_sizes = {}; account_info = {}; is_running = false;
    subscriptions: CurrentSubscription[] = []; time_interval: ReturnType<typeof setInterval> | null = null; has_active_symbols = false;
    is_stopping = false; active_symbols: any[] = []; current_auth_subscriptions: SubscriptionPromise[] = []; is_authorized = false;
    active_symbols_promise: Promise<any[] | undefined> | null = null; common_store: CommonStore | undefined; reconnection_attempts = 0;
    private readonly ACTIVE_SYMBOLS_TIMEOUT_MS = 10000; private readonly ENRICHMENT_TIMEOUT_MS = 10000; private readonly MAX_RECONNECTION_ATTEMPTS = 5;
    unsubscribeAllSubscriptions = () => { this.current_auth_subscriptions?.forEach(p => p.then(({ subscription }) => { if (subscription?.id) this.api?.send({ forget: subscription.id }); })); this.current_auth_subscriptions = []; };
    onsocketopen() { setConnectionStatus(CONNECTION_STATUS.OPENED); this.reconnection_attempts = 0; const store = globalObserver.getState('client.store'); if (store) store.setIsAccountRegenerating(false); this.handleTokenExchangeIfNeeded(); }
    private async handleTokenExchangeIfNeeded() {
        const params = new URLSearchParams(window.location.search); const account_id = params.get('account_id'); const accountType = params.get('account_type');
        if (account_id) { localStorage.setItem('active_loginid', account_id); removeUrlParameter('account_id'); }
        if (accountType) { localStorage.setItem('account_type', accountType); removeUrlParameter('account_type'); }
        let activeAccountId: string | null = getAccountId();
        if (!activeAccountId) { try { const stored = sessionStorage.getItem('deriv_accounts'); if (stored) { const accounts = JSON.parse(stored); if (accounts?.length && accounts[0].account_id) { activeAccountId = accounts[0].account_id; localStorage.setItem('active_loginid', activeAccountId); localStorage.setItem('account_type', activeAccountId.startsWith('VRT') || activeAccountId.startsWith('VRTC') ? 'demo' : 'real'); } } } catch (error) { console.error('[APIBase] Error reading accounts from sessionStorage:', error); } }
        if (activeAccountId) { setIsAuthorizing(true); await this.authorizeAndSubscribe(); }
    }
    onsocketclose() { setConnectionStatus(CONNECTION_STATUS.CLOSED); this.reconnectIfNotConnected(); }
    async init(force_create_connection = false) {
        this.toggleRunButton(true); if (this.api) this.unsubscribeAllSubscriptions(); if (!force_create_connection) this.reconnection_attempts = 0;
        if (!this.api || this.api?.connection.readyState !== 1 || force_create_connection) {
            if (this.api?.connection) { ApiHelpers.disposeInstance(); setConnectionStatus(CONNECTION_STATUS.CLOSED); this.api.disconnect(); this.api.connection.removeEventListener('open', this.onsocketopen.bind(this)); this.api.connection.removeEventListener('close', this.onsocketclose.bind(this)); }
            this.api = await generateDerivApiInstance(); this.api?.connection.addEventListener('open', this.onsocketopen.bind(this)); this.api?.connection.addEventListener('close', this.onsocketclose.bind(this));
            const store = globalObserver.getState('client.store'); const active = getAccountId(); if (store && active) store.setWebSocketLoginId(active);
        }
        const hasAccountID = V2GetActiveAccountId(); if (!this.has_active_symbols && !hasAccountID) this.active_symbols_promise = this.getActiveSymbols().then(() => undefined);
        this.initEventListeners(); if (this.time_interval) clearInterval(this.time_interval); this.time_interval = null; chart_api.init(force_create_connection);
    }
    getConnectionStatus() { if (this.api?.connection) return socket_state[this.api.connection.readyState as keyof typeof socket_state] || 'Unknown'; return 'Socket not initialized'; }
    terminate() { if (this.api) this.api.disconnect(); }
    initEventListeners() { if (window) { window.addEventListener('online', this.reconnectIfNotConnected); window.addEventListener('focus', this.reconnectIfNotConnected); } }
    async createNewInstance(account_id: string) { if (this.account_id !== account_id) await this.init(); }
    reconnectIfNotConnected = () => { if (this.api?.connection?.readyState && this.api?.connection?.readyState > 1) { this.reconnection_attempts += 1; if (this.reconnection_attempts >= this.MAX_RECONNECTION_ATTEMPTS) { this.reconnection_attempts = 0; setIsAuthorized(false); setAccountList([]); setAuthData(null); localStorage.removeItem('active_loginid'); localStorage.removeItem('account_type'); localStorage.removeItem('accountsList'); localStorage.removeItem('clientAccounts'); } this.init(true); } };

    async authorizeAndSubscribe() {
        if (!this.api) return; this.account_id = getAccountId() || ''; setIsAuthorizing(true);
        try {
            const { balance, error } = await this.api.balance();
            if (error) { const message = isBackendError(error) ? handleBackendError(error) : error.message || 'Authorization failed'; console.error('Authorization error:', message); setIsAuthorizing(false); return { ...error, localizedMessage: message }; }
            this.account_info = { balance: balance?.balance, currency: balance?.currency, loginid: balance?.loginid }; this.token = balance?.loginid;
            const account_type = getAccountType(balance?.loginid);
            const currentAccount = balance?.loginid ? { balance: Number(balance.balance) || 0, currency: balance.currency || 'USD', is_virtual: account_type === 'real' ? 0 : 1, loginid: balance.loginid } : null;

            // Stored account metadata may be stale. Always let the authenticated Deriv WebSocket balance
            // override the currently selected account instead of replacing it with a cached 0.00 value.
            const storedAccounts = DerivWSAccountsService.getStoredAccounts();
            let accountList = storedAccounts && storedAccounts.length > 0
                ? storedAccounts.filter(a => !a.status || a.status === 'active').map(a => ({ balance: Number(a.balance) || 0, currency: a.currency || 'USD', is_virtual: a.account_type === 'demo' ? 1 : 0, loginid: a.account_id }))
                : currentAccount ? [currentAccount] : [];
            if (currentAccount) {
                const currentIndex = accountList.findIndex(a => a.loginid === currentAccount.loginid);
                if (currentIndex >= 0) accountList[currentIndex] = currentAccount;
                else accountList = [currentAccount, ...accountList];
            }

            setAccountList(accountList);
            setAuthData({ balance: balance?.balance, currency: balance?.currency, loginid: balance?.loginid, is_virtual: account_type === 'real' ? 0 : 1, account_list: accountList });
            const loginid = balance?.loginid || ''; localStorage.setItem('account_type', isDemoAccount(loginid) ? 'demo' : 'real');
            globalObserver.emit('api.authorize', { account_list: accountList, current_account: currentAccount });
            const currentClientStore = globalObserver.getState('client.store');
            if (currentClientStore && balance?.loginid) { currentClientStore.setWebSocketLoginId(balance.loginid); currentClientStore.setBalance(String(Number(balance.balance) || 0)); currentClientStore.setCurrency(balance.currency || 'USD'); }
            setIsAuthorized(true); this.is_authorized = true; localStorage.setItem('client_account_details', JSON.stringify(accountList)); localStorage.setItem('client.country', balance?.country);
            if (balance?.loginid) localStorage.setItem('active_loginid', balance.loginid);
            if (this.has_active_symbols) this.toggleRunButton(false); else this.active_symbols_promise = this.getActiveSymbols(); this.subscribe();
        } catch (e) { this.is_authorized = false; clearAuthData(); setIsAuthorized(false); globalObserver.emit('Error', e); } finally { setIsAuthorizing(false); }
    }
    async subscribe() { const subscribeToStream = (streamName: string) => doUntilDone(() => { const subscription = this.api?.send({ [streamName]: 1, subscribe: 1 }); if (subscription) this.current_auth_subscriptions.push(subscription); return subscription; }, [], this); await Promise.all(['balance', 'transaction', 'proposal_open_contract'].map(subscribeToStream)); }
    getActiveSymbols = async () => { if (!this.api) throw new Error('API connection not available for fetching active symbols'); try { const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Active symbols fetch timeout')), this.ACTIVE_SYMBOLS_TIMEOUT_MS)); const apiResult = await Promise.race([doUntilDone(() => this.api?.send({ active_symbols: 'brief' }), [], this), timeout]) as any; const { active_symbols = [], error = {} } = apiResult; if (error && Object.keys(error).length) throw new Error(`Active symbols API error: ${error.message || 'Unknown error'}`); if (!active_symbols.length) throw new Error('No active symbols received from API'); this.has_active_symbols = true; try { const processed = await Promise.race([activeSymbolsProcessorService.processActiveSymbols(active_symbols), new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Enrichment timeout')), this.ENRICHMENT_TIMEOUT_MS))]); this.active_symbols = processed.enrichedSymbols; this.pip_sizes = processed.pipSizes; } catch (e) { console.warn('Symbol enrichment failed, using raw symbols:', e); this.active_symbols = active_symbols; this.pip_sizes = {}; } this.toggleRunButton(false); return this.active_symbols; } catch (error) { console.error('Failed to fetch and process active symbols:', error); throw error; } };
    toggleRunButton = (toggle: boolean) => { const button = document.querySelector('#db-animation__run-button'); if (button) (button as HTMLButtonElement).disabled = toggle; };
    setIsRunning(toggle = false) { this.is_running = toggle; }
    pushSubscription(subscription: CurrentSubscription) { this.subscriptions.push(subscription); }
    clearSubscriptions() { this.subscriptions.forEach(s => s.unsubscribe()); this.subscriptions = []; const timeouts = globalObserver.getState('global_timeouts') ?? []; timeouts.forEach((_: unknown, i: number) => clearTimeout(i)); }
}
export const api_base = new APIBase();

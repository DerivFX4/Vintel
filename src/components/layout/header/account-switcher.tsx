import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { addComma, getCurrencyDisplayCode, getDecimalPlaces } from '@/components/shared';
import Text from '@/components/shared_ui/text';
import { api_base } from '@/external/bot-skeleton/services/api/api-base';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import { isDemoAccount } from '@/utils/account-helpers';
import { useDisplayCurrency } from '@/utils/usd-kes-conversion';
import { Localize } from '@deriv-com/translations';
import { TAccountSwitcher } from './common/types';
import AccountInfoWrapper from './account-info-wrapper';
import './account-switcher.scss';
import './account-balance-visuals.scss';

const DemoAccountIcon = () => <svg className='acc-info__account-icon-svg' viewBox='0 0 48 48' aria-hidden='true'><circle cx='24' cy='24' r='23' fill='#7799a0' /><path d='M16 12v24M16 12h8.2c6.6 0 11.8 5.2 11.8 12s-5.2 12-11.8 12H16M16 24h10.4' fill='none' stroke='#fff' strokeLinecap='round' strokeLinejoin='round' strokeWidth='4.2' /></svg>;
const RealUsdAccountIcon = () => <span style={{ width: 28, height: 28, borderRadius: '50%', display: 'inline-grid', placeItems: 'center', background: '#173b76', color: '#fff', fontSize: 11, fontWeight: 700 }}>USD</span>;

const AccountSwitcher = observer(({ activeAccount }: TAccountSwitcher) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const { accountList, activeLoginid } = useApiBase();
    const { client, run_panel } = useStore() ?? {};
    const { displayCurrency, setDisplayCurrency, formatAmount } = useDisplayCurrency();
    const is_bot_running = run_panel?.is_running || api_base.is_running;
    const isSingleAccount = !accountList || accountList.length <= 1;

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false); };
        const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside); document.addEventListener('keydown', handleKeyDown);
        return () => { document.removeEventListener('mousedown', handleClickOutside); document.removeEventListener('keydown', handleKeyDown); };
    }, []);

    const toggleDropdown = useCallback(() => { if (!is_bot_running && !isSingleAccount) setIsOpen(prev => !prev); }, [is_bot_running, isSingleAccount]);
    const handleAccountSelect = useCallback((loginid: string) => { localStorage.setItem('active_loginid', loginid); client?.checkAndRegenerateWebSocket(); setIsOpen(false); }, [client]);

    const formattedAccounts = useMemo(() => {
        if (!accountList) return [];
        return accountList.map(account => ({ loginid: account.loginid, currency: account.currency, rawBalance: Number(account.balance ?? 0), balance: addComma(Number(account.balance ?? 0).toFixed(getDecimalPlaces(account.currency))), isVirtual: isDemoAccount(account.loginid), isActive: account.loginid === activeLoginid })).sort((a, b) => (a.isActive ? -1 : b.isActive ? 1 : 0));
    }, [accountList, activeLoginid]);

    if (!activeAccount) return null;
    const { currency, isVirtual, balance } = activeAccount;
    const showChevron = !isSingleAccount && !is_bot_running;
    const convertedBalance = currency === 'USD' ? formatAmount(Number(balance ?? 0), 'USD') : `${balance} ${getCurrencyDisplayCode(currency)}`;

    return <div className='acc-info__wrapper' ref={wrapperRef}>
        <div aria-label='Display currency' style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 4 }}>
            {(['USD', 'KES'] as const).map(option => <button key={option} type='button' onClick={e => { e.stopPropagation(); setDisplayCurrency(option); }} style={{ border: 'none', borderRadius: 4, padding: '3px 7px', cursor: 'pointer', background: displayCurrency === option ? '#1e5eff' : 'transparent', color: displayCurrency === option ? '#fff' : 'inherit', fontSize: 11, fontWeight: 700 }}>{option}</button>)}
        </div>
        <AccountInfoWrapper>
            <div data-testid='dt_acc_info' id='dt_core_account-info_acc-info' role={showChevron ? 'button' : undefined} tabIndex={showChevron ? 0 : -1} aria-expanded={showChevron ? isOpen : undefined} aria-haspopup={showChevron ? 'listbox' : undefined} className={classNames('acc-info', { 'acc-info--is-virtual': isVirtual, 'acc-info--interactive': showChevron })} onClick={toggleDropdown} onKeyDown={e => { if (showChevron && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleDropdown(); } }}>
                <span className='acc-info__id' aria-hidden='true' />
                <div className='acc-info__content'>{(typeof balance !== 'undefined' || !currency) && <div className='acc-info__balance-section'>
                    <span className='acc-info__account-icon' aria-label={isVirtual ? 'Demo account' : 'Real USD account'} title={isVirtual ? 'Demo account' : 'Real USD account'}>{isVirtual ? <DemoAccountIcon /> : <RealUsdAccountIcon />}</span>
                    <p data-testid='dt_balance' className={classNames('acc-info__balance', { 'acc-info__balance--no-currency': !currency && !isVirtual })}>{!currency ? <Localize i18n_default_text='No currency assigned' /> : convertedBalance}</p>
                    {showChevron && <span className={classNames('acc-info__select-arrow', { 'acc-info__select-arrow--invert': isOpen })}><svg width='12' height='12' viewBox='0 0 12 12' fill='none'><path d='M2 4L6 8L10 4' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' /></svg></span>}
                </div>}</div>
            </div>
        </AccountInfoWrapper>
        {isOpen && <div className='acc-dropdown' role='listbox'>{formattedAccounts.map(account => <div key={account.loginid} role='option' aria-selected={account.isActive} tabIndex={0} className={classNames('acc-dropdown__account', { 'acc-dropdown__account--selected': account.isActive, 'acc-dropdown__account--virtual': account.isVirtual })} onClick={() => !account.isActive && handleAccountSelect(account.loginid)} onKeyDown={e => { if (!account.isActive && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleAccountSelect(account.loginid); } }}>
            <Text size='xxxs' className={classNames('acc-dropdown__account-type', { 'acc-dropdown__account-type--virtual': account.isVirtual })}>{account.isVirtual ? <Localize i18n_default_text='Demo account' /> : <Localize i18n_default_text='Real account' />}</Text>
            <Text size='xs' weight='bold' className='acc-dropdown__balance'>{account.currency ? (account.currency === 'USD' ? formatAmount(account.rawBalance, 'USD') : `${account.balance} ${getCurrencyDisplayCode(account.currency)}`) : <Localize i18n_default_text='No currency assigned' />}</Text>
        </div>)}</div>}
    </div>;
});

export default AccountSwitcher;

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { addComma, getCurrencyDisplayCode, getDecimalPlaces } from '@/components/shared';
import Text from '@/components/shared_ui/text';
import { api_base } from '@/external/bot-skeleton/services/api/api-base';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import { isDemoAccount } from '@/utils/account-helpers';
import { Localize } from '@deriv-com/translations';
import { TAccountSwitcher } from './common/types';
import AccountInfoWrapper from './account-info-wrapper';
import './account-switcher.scss';

const AccountSwitcher = observer(({ activeAccount }: TAccountSwitcher) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const { accountList, activeLoginid } = useApiBase();
    const { client, run_panel } = useStore() ?? {};

    const is_bot_running = run_panel?.is_running || api_base.is_running;
    const isSingleAccount = !accountList || accountList.length <= 1;

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false);
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const toggleDropdown = useCallback(() => {
        if (is_bot_running || isSingleAccount) return;
        setIsOpen(prev => !prev);
    }, [is_bot_running, isSingleAccount]);

    const handleAccountSelect = useCallback(
        (loginid: string) => {
            localStorage.setItem('active_loginid', loginid);
            client?.checkAndRegenerateWebSocket();
            setIsOpen(false);
        },
        [client]
    );

    const formattedAccounts = useMemo(() => {
        if (!accountList) return [];
        return accountList
            .map(account => ({
                loginid: account.loginid,
                currency: account.currency,
                balance: addComma(Number(account.balance ?? 0).toFixed(getDecimalPlaces(account.currency))),
                isVirtual: isDemoAccount(account.loginid),
                isActive: account.loginid === activeLoginid,
            }))
            .sort((a, b) => (a.isActive ? -1 : b.isActive ? 1 : 0));
    }, [accountList, activeLoginid]);

    if (!activeAccount) return null;

    const { currency, isVirtual, balance } = activeAccount;
    const showChevron = !isSingleAccount && !is_bot_running;

    const accountIcon = isVirtual ? (
        <span
            aria-label='Demo account'
            title='Demo account'
            style={{
                alignItems: 'center',
                background: '#eef5f5',
                border: '2px solid #8ba7aa',
                borderRadius: '50%',
                color: '#5f8589',
                display: 'inline-flex',
                flex: '0 0 auto',
                fontSize: '1.5rem',
                fontWeight: 700,
                height: '3.2rem',
                justifyContent: 'center',
                lineHeight: 1,
                marginRight: '0.8rem',
                width: '3.2rem',
            }}
        >
            D
        </span>
    ) : (
        <span
            aria-label='Real USD account'
            title='Real USD account'
            style={{ display: 'inline-flex', flex: '0 0 auto', height: '3.2rem', marginRight: '0.8rem', width: '3.2rem' }}
        >
            <svg width='32' height='32' viewBox='0 0 32 32' aria-hidden='true'>
                <defs>
                    <clipPath id='usd-flag-circle'>
                        <circle cx='16' cy='16' r='15' />
                    </clipPath>
                </defs>
                <g clipPath='url(#usd-flag-circle)'>
                    <rect width='32' height='32' fill='#fff' />
                    <rect y='0' width='32' height='2.46' fill='#b22234' />
                    <rect y='4.92' width='32' height='2.46' fill='#b22234' />
                    <rect y='9.84' width='32' height='2.46' fill='#b22234' />
                    <rect y='14.76' width='32' height='2.46' fill='#b22234' />
                    <rect y='19.68' width='32' height='2.46' fill='#b22234' />
                    <rect y='24.6' width='32' height='2.46' fill='#b22234' />
                    <rect y='29.52' width='32' height='2.48' fill='#b22234' />
                    <rect width='15.5' height='17.2' fill='#3c3b6e' />
                    {Array.from({ length: 15 }).map((_, index) => {
                        const row = Math.floor(index / 3);
                        const column = index % 3;
                        return (
                            <circle
                                key={index}
                                cx={3.2 + column * 4.6 + (row % 2 ? 1.8 : 0)}
                                cy={3.1 + row * 3.0}
                                r='0.65'
                                fill='#fff'
                            />
                        );
                    })}
                </g>
                <circle cx='16' cy='16' r='15' fill='none' stroke='#d1d9db' strokeWidth='1.5' />
            </svg>
        </span>
    );

    return (
        <div className='acc-info__wrapper' ref={wrapperRef}>
            <AccountInfoWrapper>
                <div
                    data-testid='dt_acc_info'
                    id='dt_core_account-info_acc-info'
                    role={showChevron ? 'button' : undefined}
                    tabIndex={showChevron ? 0 : -1}
                    aria-expanded={showChevron ? isOpen : undefined}
                    aria-haspopup={showChevron ? 'listbox' : undefined}
                    className={classNames('acc-info', {
                        'acc-info--is-virtual': isVirtual,
                        'acc-info--interactive': showChevron,
                    })}
                    onClick={toggleDropdown}
                    onKeyDown={e => {
                        if (showChevron && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            toggleDropdown();
                        }
                    }}
                >
                    <span className='acc-info__id' aria-hidden='true' />
                    <div className='acc-info__content'>
                        {(typeof balance !== 'undefined' || !currency) && (
                            <div className='acc-info__balance-section'>
                                {accountIcon}
                                <p
                                    data-testid='dt_balance'
                                    className={classNames('acc-info__balance', {
                                        'acc-info__balance--no-currency': !currency && !isVirtual,
                                    })}
                                >
                                    {!currency ? (
                                        <Localize i18n_default_text='No currency assigned' />
                                    ) : (
                                        `${balance} ${getCurrencyDisplayCode(currency)}`
                                    )}
                                </p>
                                {showChevron && (
                                    <span
                                        className={classNames('acc-info__select-arrow', {
                                            'acc-info__select-arrow--invert': isOpen,
                                        })}
                                        style={{ marginLeft: '1.2rem' }}
                                    >
                                        <svg width='12' height='12' viewBox='0 0 12 12' fill='none'>
                                            <path d='M2 4L6 8L10 4' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
                                        </svg>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </AccountInfoWrapper>
            {isOpen && (
                <div className='acc-dropdown' role='listbox'>
                    {formattedAccounts.map(account => (
                        <div
                            key={account.loginid}
                            role='option'
                            aria-selected={account.isActive}
                            tabIndex={0}
                            className={classNames('acc-dropdown__account', {
                                'acc-dropdown__account--selected': account.isActive,
                                'acc-dropdown__account--virtual': account.isVirtual,
                            })}
                            onClick={() => !account.isActive && handleAccountSelect(account.loginid)}
                            onKeyDown={e => {
                                if (!account.isActive && (e.key === 'Enter' || e.key === ' ')) {
                                    e.preventDefault();
                                    handleAccountSelect(account.loginid);
                                }
                            }}
                        >
                            <Text size='xxxs' className={classNames('acc-dropdown__account-type', { 'acc-dropdown__account-type--virtual': account.isVirtual })}>
                                {account.isVirtual ? <Localize i18n_default_text='Demo account' /> : <Localize i18n_default_text='Real account' />}
                            </Text>
                            <Text size='xs' weight='bold' className='acc-dropdown__balance'>
                                {account.currency ? `${account.balance} ${getCurrencyDisplayCode(account.currency)}` : <Localize i18n_default_text='No currency assigned' />}
                            </Text>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

export default AccountSwitcher;

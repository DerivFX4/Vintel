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
import './account-balance-visuals.scss';

const DemoAccountIcon = () => (
    <svg className='acc-info__account-icon-svg' viewBox='0 0 48 48' aria-hidden='true'>
        <circle cx='24' cy='24' r='24' fill='#76969d' />
        <path d='M13 8h13.2c7.5 0 12.8 5.1 12.8 12.5 0 4.5-2.2 8-6 10.1 3.9 2 6 5.6 6 10.2 0 7.2-5.3 12.2-12.8 12.2H13v-7h12.6c3.8 0 6.1-2.1 6.1-5.5 0-3.6-2.4-5.8-6.3-5.8H13v-7h12.2c3.9 0 6.3-2.3 6.3-6.1 0-3.7-2.4-6-6.3-6H20v30.4h-7V8Z' fill='#fff' />
    </svg>
);

const RealUsdAccountIcon = () => (
    <svg className='acc-info__account-icon-svg' viewBox='0 0 48 48' aria-hidden='true'>
        <defs>
            <clipPath id='vintel-usd-flag-circle'>
                <circle cx='24' cy='24' r='24' />
            </clipPath>
        </defs>
        <g clipPath='url(#vintel-usd-flag-circle)'>
            <rect width='48' height='48' fill='#fff' />
            <rect y='0' width='48' height='3.7' fill='#d61f2c' />
            <rect y='7.4' width='48' height='3.7' fill='#d61f2c' />
            <rect y='14.8' width='48' height='3.7' fill='#d61f2c' />
            <rect y='22.2' width='48' height='3.7' fill='#d61f2c' />
            <rect y='29.6' width='48' height='3.7' fill='#d61f2c' />
            <rect y='37' width='48' height='3.7' fill='#d61f2c' />
            <rect y='44.4' width='48' height='3.6' fill='#d61f2c' />
            <rect width='24.5' height='25.9' fill='#173b76' />
            {Array.from({ length: 20 }).map((_, index) => {
                const row = Math.floor(index / 4);
                const column = index % 4;
                return (
                    <circle
                        key={index}
                        cx={3.8 + column * 5 + (row % 2 ? 2.5 : 0)}
                        cy={3.5 + row * 4.2}
                        r='0.85'
                        fill='#fff'
                    />
                );
            })}
        </g>
    </svg>
);

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
        if (!is_bot_running && !isSingleAccount) setIsOpen(prev => !prev);
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
                                <span
                                    className='acc-info__account-icon'
                                    aria-label={isVirtual ? 'Demo account' : 'Real USD account'}
                                    title={isVirtual ? 'Demo account' : 'Real USD account'}
                                >
                                    {isVirtual ? <DemoAccountIcon /> : <RealUsdAccountIcon />}
                                </span>
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
                                    >
                                        <svg width='12' height='12' viewBox='0 0 12 12' fill='none'>
                                            <path
                                                d='M2 4L6 8L10 4'
                                                stroke='currentColor'
                                                strokeWidth='1.5'
                                                strokeLinecap='round'
                                                strokeLinejoin='round'
                                            />
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
                            <Text
                                size='xxxs'
                                className={classNames('acc-dropdown__account-type', {
                                    'acc-dropdown__account-type--virtual': account.isVirtual,
                                })}
                            >
                                {account.isVirtual ? (
                                    <Localize i18n_default_text='Demo account' />
                                ) : (
                                    <Localize i18n_default_text='Real account' />
                                )}
                            </Text>
                            <Text size='xs' weight='bold' className='acc-dropdown__balance'>
                                {account.currency ? (
                                    `${account.balance} ${getCurrencyDisplayCode(account.currency)}`
                                ) : (
                                    <Localize i18n_default_text='No currency assigned' />
                                )}
                            </Text>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

export default AccountSwitcher;

import { lazy, Suspense } from 'react';
import { observer } from 'mobx-react-lite';
import ErrorBoundary from '@/components/error-component/error-boundary';
import ErrorComponent from '@/components/error-component/error-component';
import { useStore } from '@/hooks/useStore';
import './app-root.scss';

const AppContent = lazy(() => import('./app-content'));

const ErrorComponentWrapper = observer(() => {
    const { common } = useStore();

    if (!common.error) return null;

    return (
        <ErrorComponent
            header={common.error?.header}
            message={common.error?.message}
            redirect_label={common.error?.redirect_label}
            redirectOnClick={common.error?.redirectOnClick}
            should_clear_error_on_click={common.error?.should_clear_error_on_click}
            setError={common.setError}
            redirect_to={common.error?.redirect_to}
            should_redirect={common.error?.should_redirect}
        />
    );
});

/**
 * The public dashboard must render immediately when the site is opened.
 * Deriv Bot API/account initialization is intentionally NOT performed here.
 * OAuthTokenExchangeService starts API initialization after a successful
 * OAuth callback, so the "Initializing Deriv Bot account..." phase belongs
 * to the login flow instead of the initial page load.
 */
const AppRoot = () => {
    const store = useStore();

    if (!store) return null;

    return (
        <Suspense fallback={null}>
            <ErrorBoundary root_store={store}>
                <ErrorComponentWrapper />
                <AppContent />
            </ErrorBoundary>
        </Suspense>
    );
};

export default AppRoot;

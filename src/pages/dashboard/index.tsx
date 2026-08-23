import { observer } from 'mobx-react-lite';
import { useStore } from '../../hooks/useStore';
import RiskDisclaimer from './risk-disclaimer';
import './dashboard.scss';

const Dashboard = observer(() => {
    const { ui } = useStore();
    const { isAuthorized } = ui;

    return (
        <main className='vintelfx-dashboard'>
            <div className='vintelfx-dashboard__content'>
                <div>Dashboard observing from mobx store.</div>
                <div>isAuthorized: {isAuthorized.toString()}</div>
            </div>
            <RiskDisclaimer />
        </main>
    );
});

export default Dashboard;

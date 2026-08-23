import { observer } from 'mobx-react-lite';
import { useStore } from '../../hooks/useStore';
import RiskDisclaimer from './risk-disclaimer';

const Dashboard = observer(() => {
    const { ui } = useStore();
    const { isAuthorized } = ui;
    return (
        <div style={{ paddingTop: '12px' }}>
            <div>Dashboard observing from mobx store.</div>
            <div>isAuthorized: {isAuthorized.toString()}</div>
            <RiskDisclaimer />
        </div>
    );
});

export default Dashboard;

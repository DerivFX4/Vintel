import React from 'react';
import { observer } from 'mobx-react-lite';
import Flyout from '@/components/flyout';
import { useStore } from '@/hooks/useStore';
import StopBotModal from '../dashboard/stop-bot-modal';
import Toolbar from './toolbar';
import Toolbox from './toolbox';
import './workspace.scss';

const WorkspaceWrapper = observer(() => {
    const { blockly_store } = useStore();
    const { onMount, onUnmount, is_loading } = blockly_store;
    const [workspace_ready, setWorkspaceReady] = React.useState(!!window.Blockly?.derivWorkspace);

    React.useEffect(() => {
        onMount();
        const timer = window.setInterval(() => {
            if (window.Blockly?.derivWorkspace) {
                setWorkspaceReady(true);
                window.clearInterval(timer);
            }
        }, 100);

        return () => {
            window.clearInterval(timer);
            onUnmount();
        };
    }, [onMount, onUnmount]);

    React.useEffect(() => {
        if (window.Blockly?.derivWorkspace) setWorkspaceReady(true);
    }, [is_loading]);

    // Keep the dashboard visible while the builder initializes. Once Blockly
    // creates its workspace, mount the complete builder UI around it.
    if (is_loading && !workspace_ready) return null;
    if (!workspace_ready && !window.Blockly?.derivWorkspace) return null;

    return (
        <React.Fragment>
            <Toolbox />
            <Toolbar />
            <Flyout />
            <StopBotModal />
        </React.Fragment>
    );
});

export default WorkspaceWrapper;

import React from 'react';
import '../main/vintelfx-tabs.scss';

/**
 * Signal AI is intentionally isolated from existing dashboard, Blockly,
 * chart, tutorial, authentication, and trading functionality. The scanner
 * implementation will be added separately.
 */
const SignalAI = () => {
    return <div className='signal-ai-tab' aria-label='Signal AI' />;
};

export default SignalAI;

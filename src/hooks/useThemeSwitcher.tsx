import { useCallback, useEffect } from 'react';
import { useStore } from './useStore';

const useThemeSwitcher = () => {
    const { ui } = useStore() ?? {
        ui: {
            setDarkMode: () => {},
            is_dark_mode_on: false,
        },
    };
    const { setDarkMode, is_dark_mode_on } = ui;

    const applyTheme = useCallback(
        (theme: 'light' | 'dark') => {
            const body = document.body;
            if (!body) return;

            body.classList.remove('theme--light', 'theme--dark');
            body.classList.add(`theme--${theme}`);
            localStorage.setItem('theme', theme);
            setDarkMode(theme === 'dark');
        },
        [setDarkMode]
    );

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        const theme: 'light' | 'dark' = savedTheme === 'dark' ? 'dark' : 'light';
        applyTheme(theme);
    }, [applyTheme]);

    const toggleTheme = useCallback(() => {
        applyTheme(is_dark_mode_on ? 'light' : 'dark');
    }, [applyTheme, is_dark_mode_on]);

    return {
        toggleTheme,
        is_dark_mode_on,
        setDarkMode,
    };
};

export default useThemeSwitcher;

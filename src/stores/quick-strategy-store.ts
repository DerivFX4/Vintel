import { action, makeObservable, observable, reaction } from 'mobx';
import { ApiHelpers, config as qs_config, load } from '@/external/bot-skeleton';
import { save_types } from '@/external/bot-skeleton/constants/save-type';
import { addDynamicBlockToDOM } from '@/utils/xml-dom-quick-strategy';
import { STRATEGIES } from '../pages/bot-builder/quick-strategy/config';
import { TFormData } from '../pages/bot-builder/quick-strategy/types';
import { getSetting, storeSetting } from '../utils/settings';
import RootStore from './root-store';

export type TActiveSymbol = { group: string; text: string; value: string };
export type TLossThresholdWarningData = { show: boolean; loss_amount?: string | number; currency?: string; highlight_field?: Array<string>; already_shown?: boolean };

interface IQuickStrategyStore {
    additional_data: Record<string, unknown>;
    current_duration_min_max: { min: number; max: number };
    root_store: RootStore;
    is_open: boolean;
    selected_strategy: string;
    selected_strategy_for_notofy: string;
    form_data: TFormData;
    loss_threshold_warning_data: { show: boolean };
    is_contract_dialog_open: boolean;
    is_stop_bot_dialog_open: boolean;
    is_options_loading: boolean;
    setLossThresholdWarningData: (data: TLossThresholdWarningData) => void;
    setFormVisibility: (is_open: boolean) => void;
    setSelectedStrategy: (strategy: string) => void;
    setValue: (name: string, value: string) => void;
    onSubmit: (data: TFormData) => void;
    loadFreeBot: (xml: string, name: string) => Promise<void>;
    toggleStopBotDialog: () => void;
    setCurrentDurationMinMax: (min: number, max: number) => void;
    setOptionsLoading: (is_loading: boolean) => void;
}

export default class QuickStrategyStore implements IQuickStrategyStore {
    root_store: RootStore;
    is_open = false;
    selected_strategy = 'MARTINGALE';
    selected_strategy_for_notofy = '';
    form_data: TFormData = {
        symbol: qs_config().QUICK_STRATEGY.DEFAULT.symbol,
        tradetype: qs_config().QUICK_STRATEGY.DEFAULT.tradetype,
        durationtype: qs_config().QUICK_STRATEGY.DEFAULT.durationtype,
        action: 'RUN',
    };
    is_contract_dialog_open = false;
    is_stop_bot_dialog_open = false;
    is_options_loading = false;
    current_duration_min_max = { min: 0, max: 10 };
    loss_threshold_warning_data: TLossThresholdWarningData = { show: false };
    additional_data = {};

    constructor(root_store: RootStore) {
        makeObservable(this, {
            additional_data: observable, current_duration_min_max: observable, form_data: observable,
            is_contract_dialog_open: observable, is_open: observable, is_stop_bot_dialog_open: observable,
            is_options_loading: observable, initializeLossThresholdWarningData: action, selected_strategy: observable,
            selected_strategy_for_notofy: observable, loss_threshold_warning_data: observable, onSubmit: action,
            setAdditionalData: action, setCurrentDurationMinMax: action, setFormVisibility: action,
            setSelectedStrategy: action, setLossThresholdWarningData: action, setValue: action,
            toggleStopBotDialog: action, setOptionsLoading: action,
        });
        this.root_store = root_store;
        const savedStrategy = getSetting('selected_strategy_for_notofy');
        if (savedStrategy) this.selected_strategy_for_notofy = savedStrategy;
        reaction(() => this.is_open, () => { if (!this.is_open) this.selected_strategy = 'MARTINGALE'; });

        if (typeof window !== 'undefined') {
            window.addEventListener('vintelfx-load-free-bot', (event: Event) => {
                const detail = (event as CustomEvent<{ name?: string; xml?: string }>).detail;
                if (!detail?.xml) return;
                void this.loadFreeBot(detail.xml, detail.name || 'Free Bot');
            });
            window.addEventListener('vintelfx-load-and-run-signal-bot', (event: Event) => {
                const detail = (event as CustomEvent<{ result?: any; config?: any }>).detail;
                if (!detail?.result || this.root_store.run_panel.is_running) return;
                event.stopImmediatePropagation();
                void this.loadSignalWithQuickStrategy(detail.result, detail.config || {});
            });
        }
    }

    loadFreeBot = async (xml: string, name: string) => {
        // Vintel Even bot is generated from the repository's known-good Quick Strategy
        // template instead of directly executing its earlier malformed custom XML.
        // action: LOAD deliberately prevents automatic trading.
        if (name === 'Under 7 Recovery EVEN') {
            // Validated Quick Strategy generation: Digits → Over/Under → Under 7.
            // Load only; the bot does not start trading until the user runs it.
            const form_data: TFormData = {
                ...this.form_data,
                symbol: 'R_50',
                tradetype: 'overunder',
                type: 'DIGITUNDER',
                last_digit_prediction: 7,
                stake: 0.5,
                profit: 5,
                loss: 10,
                size: 2,
                duration: 1,
                durationtype: 't',
                action: 'LOAD',
            };
            this.selected_strategy = 'MARTINGALE';
            this.form_data = { ...this.form_data, ...form_data };
            await this.onSubmit(form_data);
            return;
        }

        if (name === 'Vintel Even bot') {
            const form_data: TFormData = {
                ...this.form_data,
                symbol: '1HZ25V',
                tradetype: 'evenodd',
                type: 'DIGITEVEN',
                stake: 1,
                profit: 5,
                loss: 10,
                size: 2,
                target_wins: 2,
                duration: 1,
                durationtype: 't',
                action: 'LOAD',
            };
            this.selected_strategy = 'MARTINGALE';
            this.form_data = { ...this.form_data, ...form_data };
            await this.onSubmit(form_data);
            return;
        }

        const workspace = window.Blockly?.derivWorkspace;
        if (!workspace) throw new Error('Bot Builder workspace is not ready.');
        const strategy_dom = window.Blockly.utils.xml.textToDom(xml);
        await load({
            block_string: window.Blockly.Xml.domToText(strategy_dom),
            file_name: name,
            workspace,
            from: save_types.UNSAVED,
            drop_event: null,
            strategy_id: null,
            showIncompatibleStrategyDialog: null,
        });
    };

    loadSignalWithQuickStrategy = async (result: any, signal_config: any) => {
        const signal = String(result.signal || '').toUpperCase();
        const is_over_under = signal.startsWith('OVER') || signal.startsWith('UNDER');
        const prediction = Number(signal.match(/\d+/)?.[0] ?? 5);
        const form_data: TFormData = {
            ...this.form_data,
            symbol: result.market || this.form_data.symbol,
            tradetype: is_over_under ? 'overunder' : 'evenodd',
            type: is_over_under
                ? (signal.startsWith('OVER') ? 'DIGITOVER' : 'DIGITUNDER')
                : (signal === 'EVEN' ? 'DIGITEVEN' : 'DIGITODD'),
            last_digit_prediction: prediction,
            stake: Number(signal_config.stake) || 0.5,
            loss: Number(signal_config.stop_loss) || 50,
            size: Number(signal_config.martingale) || 2,
            target_wins: Number(signal_config.wins) || 4,
            duration: 1,
            durationtype: 't',
            action: 'RUN',
        };
        this.selected_strategy = 'MARTINGALE';
        this.form_data = { ...this.form_data, ...form_data };
        await this.onSubmit(form_data);
    };

    setAdditionalData = (data: Record<string, unknown>) => { this.additional_data = { ...this.additional_data, ...data }; };
    setLossThresholdWarningData = (data: TLossThresholdWarningData) => { this.loss_threshold_warning_data = { ...this.loss_threshold_warning_data, ...data }; };
    initializeLossThresholdWarningData = () => { this.loss_threshold_warning_data = { show: false, highlight_field: [], already_shown: false }; };
    setFormVisibility = (is_open: boolean) => { this.is_open = is_open; };
    setSelectedStrategy = (strategy: string) => { this.selected_strategy = strategy; };
    setValue = (name: string, value: string | number | boolean) => { this.form_data[name as keyof TFormData] = value; };
    setCurrentDurationMinMax = (min = 0, max = 10) => { this.current_duration_min_max = { min, max }; };

    onSubmit = async (data: TFormData) => {
        const { contracts_for } = ApiHelpers?.instance ?? {};
        if (!contracts_for) return;
        const market = await contracts_for.getMarketBySymbol(data.symbol);
        const submarket = await contracts_for.getSubmarketBySymbol(data.symbol);
        const trade_type_cat = await contracts_for.getTradeTypeCategoryByTradeType(data.tradetype);
        const selected_strategy = STRATEGIES()[this.selected_strategy];
        this.selected_strategy_for_notofy = this.selected_strategy;
        storeSetting('selected_strategy_for_notofy', this.selected_strategy);
        const strategy_xml = await import(/* webpackChunkName: `[request]` */ `../xml/${selected_strategy.name}.xml`);
        const strategy_dom = window.Blockly.utils.xml.textToDom(strategy_xml.default);
        addDynamicBlockToDOM('PREDICTION', 'last_digit_prediction', trade_type_cat, strategy_dom);
        const modifyValueInputs = (key: string, value: number) => {
            const el_value_inputs = strategy_dom?.querySelectorAll(`value[strategy_value="${key}"]`);
            el_value_inputs?.forEach((el_value_input: HTMLElement) => {
                if (key.includes('boolean')) el_value_input.innerHTML = `<block type="logic_boolean"><field name="BOOL">${value ? 'TRUE' : 'FALSE'}</field></block>`;
                else el_value_input.innerHTML = `<shadow type="math_number"><field name="NUM">${value}</field></shadow>`;
            });
        };
        const modifyFieldDropdownValues = (name: string, value: string) => {
            const name_list = `${name.toUpperCase()}_LIST`;
            strategy_dom?.querySelectorAll(`field[name="${name_list}"]`)?.forEach((el_block: HTMLElement) => { el_block.innerHTML = value; });
        };
        const { unit, action, type, growth_rate, ...rest_data } = data;
        const fields_to_update = {
            market, submarket, tradetypecat: trade_type_cat, dalembert_unit: unit, oscar_unit: unit,
            type: 'both', ...rest_data, purchase: type, growthrate: growth_rate ? growth_rate.toString() : undefined,
        };
        Object.keys(fields_to_update).forEach(key => {
            const value = fields_to_update[key as keyof typeof fields_to_update];
            if (!isNaN(value as number) && key !== 'growthrate') modifyValueInputs(key, value as number);
            else if (typeof value === 'string') modifyFieldDropdownValues(key, value);
        });
        const { derivWorkspace: workspace } = Blockly;
        if (action === 'RUN') {
            workspace?.waitForBlockEvent({ block_type: 'trade_definition', event_type: window.Blockly.Events.BLOCK_CREATE, timeout: 5000 })
                .then(() => this.root_store.run_panel.onRunButtonClick());
        }
        this.setFormVisibility(false);
        await load({ block_string: window.Blockly.Xml.domToText(strategy_dom), file_name: selected_strategy.label, workspace, from: save_types.UNSAVED, drop_event: null, strategy_id: null, showIncompatibleStrategyDialog: null });
    };
    toggleStopBotDialog = (): void => { this.is_contract_dialog_open = !this.is_contract_dialog_open; this.is_stop_bot_dialog_open = !this.is_stop_bot_dialog_open; this.setFormVisibility(false); };
    setOptionsLoading = (is_loading: boolean): void => { this.is_options_loading = is_loading; };
}
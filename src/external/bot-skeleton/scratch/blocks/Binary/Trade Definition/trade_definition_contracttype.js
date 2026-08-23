import { localize } from '@deriv-com/translations';
import { config } from '../../../../constants/config';
import { getContractTypeOptions } from '../../../shared';
import { excludeOptionFromContextMenu, modifyContextMenu } from '../../../utils';

const MARTINGALE_KEY = 'vintelfx_martingale_multiplier';

window.Blockly.Blocks.trade_definition_contracttype = {
    init() {
        this.jsonInit({
            message0: localize('Contract Type: {{ contract_type }}', { contract_type: '%1' }),
            args0: [
                {
                    type: 'field_dropdown',
                    name: 'TYPE_LIST',
                    options: [['', '']],
                },
            ],
            colour: window.Blockly.Colours.Special1.colour,
            colourSecondary: window.Blockly.Colours.Special1.colourSecondary,
            colourTertiary: window.Blockly.Colours.Special1.colourTertiary,
            tooltip: localize(
                'If the contract type is “Both”, then the Purchase Conditions should include both Rise and Fall using the “Conditional Block"'
            ),
            previousStatement: null,
            nextStatement: null,
        });

        this.appendDummyInput('MARTINGALE')
            .appendField(localize('Martingale'))
            .appendField(
                new window.Blockly.FieldNumber(
                    Number(window.localStorage.getItem(MARTINGALE_KEY)) || 2,
                    1,
                    100,
                    0.01
                ),
                'MARTINGALE_MULTIPLIER'
            )
            .appendField('×');

        this.setMovable(false);
        this.setDeletable(false);
    },
    onchange(event) {
        if (!this.workspace || window.Blockly.derivWorkspace.isFlyoutVisible || this.workspace.isDragging()) {
            return;
        }

        this.enforceLimitations();

        const is_load_event = /^dbot-load/.test(event.group);

        if (event.type === window.Blockly.Events.BLOCK_CHANGE) {
            if (event.name === 'TRADETYPE_LIST') {
                const trade_type = event.newValue;
                const contract_type_list = this.getField('TYPE_LIST');
                const contract_type_options = [];

                const trade_types = getContractTypeOptions('both', trade_type);

                if (trade_types.length > 1) {
                    contract_type_options.push(['Both', 'both']);
                }

                contract_type_options.push(...trade_types);

                if (contract_type_options.length === 0) {
                    contract_type_options.push(...config().NOT_AVAILABLE_DROPDOWN_OPTIONS);
                }

                contract_type_list.updateOptions(contract_type_options, {
                    event_group: event.group,
                    default_value: is_load_event ? contract_type_list.getValue() : undefined,
                });
            }

            if (event.name === 'MARTINGALE_MULTIPLIER' && event.blockId === this.id) {
                const multiplier = Number(event.newValue);
                if (Number.isFinite(multiplier) && multiplier >= 1) {
                    window.localStorage.setItem(MARTINGALE_KEY, String(multiplier));
                    window.dispatchEvent(
                        new CustomEvent('vintelfx-martingale-change', { detail: { value: multiplier } })
                    );
                }
            }
        }
    },
    customContextMenu(menu) {
        const menu_items = [localize('Enable Block'), localize('Disable Block')];
        excludeOptionFromContextMenu(menu, menu_items);
        modifyContextMenu(menu);
    },
    enforceLimitations: window.Blockly.Blocks.trade_definition_market.enforceLimitations,
};
window.Blockly.JavaScript.javascriptGenerator.forBlock.trade_definition_contracttype = () => '';

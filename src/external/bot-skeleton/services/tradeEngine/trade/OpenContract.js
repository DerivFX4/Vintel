import { getRoundedNumber } from '@/components/shared';
import { api_base } from '../../api/api-base';
import { contract as broadcastContract, contractStatus } from '../utils/broadcast';
import { openContractReceived, sell } from './state/actions';

export default Engine =>
    class OpenContract extends Engine {
        observeOpenContract() {
            if (!api_base.api) return;
            const subscription = api_base.api.onMessage().subscribe(({ data }) => {
                if (data.msg_type === 'proposal_open_contract') {
                    const contract = data.proposal_open_contract;

                    if (!contract || !this.expectedContractId(contract?.contract_id)) {
                        return;
                    }

                    this.setContractFlags(contract);

                    // Dedicated settlement path for the isolated Only Ups/Only Downs pair.
                    if (this.pairContractIds?.length) {
                        this.handlePairContract(contract);
                        return;
                    }

                    this.data.contract = contract;

                    broadcastContract({ accountID: api_base.account_info.loginid, ...contract });

                    if (this.isSold) {
                        this.contractId = '';
                        clearTimeout(this.transaction_recovery_timeout);
                        this.updateTotals(contract);
                        contractStatus({
                            id: 'contract.sold',
                            data: contract.transaction_ids.sell,
                            contract,
                        });

                        if (this.afterPromise) {
                            this.afterPromise();
                        }

                        this.store.dispatch(sell());
                    } else {
                        this.store.dispatch(openContractReceived());
                    }
                }
            });
            api_base.pushSubscription(subscription);
        }

        handlePairContract(contract) {
            this.data.contract = contract;

            broadcastContract({ accountID: api_base.account_info.loginid, ...contract });

            if (!this.isSold) {
                this.store.dispatch(openContractReceived());
                return;
            }

            if (!this.pairSettledContracts) {
                this.pairSettledContracts = new Set();
            }

            // Ignore duplicate sold updates for the same contract subscription.
            if (this.pairSettledContracts.has(contract.contract_id)) {
                return;
            }

            this.pairSettledContracts.add(contract.contract_id);
            this.updateTotals(contract);

            contractStatus({
                id: 'contract.sold',
                data: contract.transaction_ids.sell,
                contract,
            });

            // Do not finish the trade cycle until both legs of the pair are sold.
            if (this.pairSettledContracts.size < this.pairContractIds.length) {
                return;
            }

            this.contractId = '';
            this.pairContractIds = [];
            this.pairSettledContracts.clear();
            clearTimeout(this.transaction_recovery_timeout);

            if (this.afterPromise) {
                this.afterPromise();
            }

            this.store.dispatch(sell());
        }

        waitForAfter() {
            return new Promise(resolve => {
                this.afterPromise = resolve;
            });
        }

        setContractFlags(contract) {
            const { is_expired, is_valid_to_sell, is_sold, entry_tick } = contract;

            this.isSold = Boolean(is_sold);
            this.isSellAvailable = !this.isSold && Boolean(is_valid_to_sell);
            this.isExpired = Boolean(is_expired);
            this.hasEntryTick = Boolean(entry_tick);
        }

        expectedContractId(contractId) {
            if (this.pairContractIds?.length) {
                return this.pairContractIds.includes(contractId);
            }

            return this.contractId && contractId === this.contractId;
        }

        getSellPrice() {
            const { bid_price: bidPrice, buy_price: buyPrice, currency } = this.data.contract;
            return getRoundedNumber(Number(bidPrice) - Number(buyPrice), currency);
        }
    };
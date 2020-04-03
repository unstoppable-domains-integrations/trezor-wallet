/* @flow */

import * as TOKEN from 'actions/constants/token';
import { toDecimalAmount } from 'utils/formatUtils';

import type { TokenInfo } from 'trezor-connect';
import type { GetState, AsyncAction, Action, Dispatch } from 'flowtype';
import type { State, Token } from 'reducers/TokensReducer';
import type { Account } from 'reducers/AccountsReducer';
import type { NetworkToken } from 'reducers/LocalStorageReducer';
import * as BlockchainActions from 'actions/ethereum/BlockchainActions';

export type TokenAction =
    | {
          type: typeof TOKEN.FROM_STORAGE,
          payload: State,
      }
    | {
          type: typeof TOKEN.ADD,
          payload: Token,
      }
    | {
          type: typeof TOKEN.REMOVE,
          token: Token,
      }
    | {
          type: typeof TOKEN.SET_BALANCE,
          payload: State,
      };

// action from component <reactSelect>
export const load = ($input: string, network: string): AsyncAction => async (
    dispatch: Dispatch,
    getState: GetState
): Promise<any> => {
    let input = $input;
    if (input.length < 1) input = '0x';

    const tokens = getState().localStorage.tokens[network];
    const value = input.toLowerCase();
    const result = tokens.filter(
        t =>
            t.symbol.toLowerCase().indexOf(value) >= 0 ||
            t.address.toLowerCase().indexOf(value) >= 0 ||
            t.name.toLowerCase().indexOf(value) >= 0
    );

    if (result.length > 0) {
        return result;
    }

    const info = await dispatch(BlockchainActions.getTokenInfo(input, network));
    if (info) {
        return [info];
    }

    return null;
};

export const setBalance = (
    tokenAddress: string,
    ethAddress: string,
    balance: string
): AsyncAction => async (dispatch: Dispatch, getState: GetState): Promise<void> => {
    const { tokens } = getState();
    const index = tokens.findIndex(t => t.address === tokenAddress && t.ethAddress === ethAddress);
    if (index >= 0) {
        const token = tokens[index];
        const payload = tokens.slice();
        payload[index] = {
            ...token,
            loaded: true,
            balance,
        };
        dispatch({
            type: TOKEN.SET_BALANCE,
            payload,
        });
    }
};

export const add = (token: NetworkToken, account: Account): AsyncAction => async (
    dispatch: Dispatch
): Promise<void> => {
    const tkn: Token = {
        loaded: false,
        deviceState: account.deviceState,
        network: account.network,
        name: token.name,
        symbol: token.symbol,
        address: token.address,
        ethAddress: account.descriptor,
        decimals: token.decimals,
        balance: '0',
    };

    dispatch({
        type: TOKEN.ADD,
        payload: tkn,
    });

    const tokenBalance = await dispatch(BlockchainActions.getTokenBalance(tkn));
    dispatch(setBalance(token.address, account.descriptor, tokenBalance));
};

export const createAccountTokens = (account: Account, tokens: TokenInfo[]): AsyncAction => async (
    dispatch: Dispatch
): Promise<void> => {
    tokens.forEach(t => {
        dispatch({
            type: TOKEN.ADD,
            payload: {
                address: t.address,
                balance: toDecimalAmount(t.balance || '0', t.decimals),
                decimals: t.decimals,
                deviceState: account.deviceState,
                ethAddress: account.descriptor,
                loaded: true,
                name: t.name || '',
                network: account.network,
                symbol: t.symbol || '',
            },
        });
    });
};

export const remove = (token: Token): Action => ({
    type: TOKEN.REMOVE,
    token,
});

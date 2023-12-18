export interface Token {
    address: string;
    name: string;
    symbol: string;
    pairAddress: string;
    reserve0: number;
    reserve1: number;
    current_price: number;
    creator_address: string;
}

export interface TokenBalance {
    token_address: string;
    owner_address: string;
    balance: number;
}

export interface Pair {
    pairAddress: string;
    token0Address: string;
    token1Address: string;
    reserveToken0: number;
    reserveToken1: number;
    token0: string;
    token1: string;
}

export interface LiquidityProvider {
    pair_address: string;
    owner_address: string;
    liquidity_tokens: number;
    token0_added: number;
    token1_added: number;
}

export interface QueryResult {
    token: Token;
    balances: TokenBalance[];
    pairs: Pair[];
    liquidityProviders: LiquidityProvider[];
}

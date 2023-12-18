import { Token, TokenBalance, Pair, LiquidityProvider, QueryResult } from './types';
import { initDbWorker } from './workerConfig';

export async function fetchTokenDetails(tokenName: string): Promise<QueryResult> {
  const worker = await initDbWorker();

  const tokenResults: unknown[] = await worker.db.query(`SELECT * FROM tokens WHERE name = ?`, [tokenName]);
  if (!tokenResults || tokenResults.length === 0) {
    throw new Error('Token not found.');
  }
  const token: Token = tokenResults[0] as Token;
  
  const balances: TokenBalance[] = await worker.db.query(`SELECT * FROM token_balances WHERE token_address = ?`, [token.address]) as TokenBalance[];
  
  const pairs: Pair[] = await worker.db.query(`SELECT * FROM pairs WHERE token0Address = ? OR token1Address = ?`, [token.address, token.address]) as Pair[];
  
  let liquidityProviders: LiquidityProvider[] = [];
  for (let pair of pairs) {
    const providers: LiquidityProvider[] = await worker.db.query(`SELECT * FROM liquidity_providers WHERE pair_address = ?`, [pair.pairAddress]) as LiquidityProvider[];
    liquidityProviders = [...liquidityProviders, ...providers];
  }

  return {
    token,
    balances,
    pairs,
    liquidityProviders
  };
}
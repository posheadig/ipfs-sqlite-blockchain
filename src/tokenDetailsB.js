import { initializeProviderFromCurrentNetwork } from './all';
import { getConstantsForNetwork } from './all';
import { getAllTokenHolders } from './all';
import { isPair } from './all';
import { getPairAddress } from './all';
import { isContract } from './all';
import { getReserves, getReservesETH } from './all';
import * as ethers from 'ethers';

export async function getTokenBlockchain(tokenAddress) {
    const { network, provider } = await initializeProviderFromCurrentNetwork();
    const { WETH_ADDRESS, UNISWAP_FACTORY_ADDRESS, uniswap_factory_abi, uniswap_pair_abi, simple_token_abi } = getConstantsForNetwork(network);

    const resultData = {
        token_address: tokenAddress,
        balances: [],
        reserve0: null,
        reserve1: null,
        current_price: null,
        valuelinks: [] 
    };

    try {
        const [holdersData, pairAddress, tokenContent, creatorName] = await Promise.all([
            getAllTokenHolders(tokenAddress, provider, simple_token_abi),
            getPairAddress(provider, uniswap_factory_abi, UNISWAP_FACTORY_ADDRESS, tokenAddress, WETH_ADDRESS),
            getTokenName(tokenAddress, simple_token_abi, provider),
            getCreatorAddress(tokenAddress, provider, simple_token_abi)
        ]);
        const reserveData = await getReservesETH(provider, uniswap_pair_abi, pairAddress, WETH_ADDRESS);
        const reserve0 = ethers.utils.formatEther(reserveData.reserve0);
        const reserve1 = ethers.utils.formatEther(reserveData.reserve1);
        
        resultData.reserve0 = parseFloat(reserve0);
        resultData.reserve1 = parseFloat(reserve1);
        resultData.current_price = resultData.reserve0 / resultData.reserve1;

        const filteredHolders = holdersData.filter(holder => holder.address !== pairAddress);

        const contractResults = await Promise.all(filteredHolders.map(holder => isContract(holder.address, provider)));

        const balancesData = await Promise.all(
            filteredHolders.map(async (holder, index) => {
                const holderAddress = holder.address;
                const balance = parseFloat(ethers.utils.formatEther(holder.balance));

                let balanceData = {
                    owner_address: holderAddress,
                    balance: balance,
                    type: 'WALLET', // Default type
                };

                if (contractResults[index]) {
                    if (await isPair(holderAddress, provider)) {
                        const token = new ethers.Contract(holderAddress, uniswap_pair_abi, provider);
                        const [name, token0Address, token1Address] = await Promise.all([token.name(), token.token0(), token.token1()]);
                        const token0 = new ethers.Contract(token0Address, simple_token_abi, provider);
                        const token1 = new ethers.Contract(token1Address, simple_token_abi, provider);
                        const [token0Name, token1Name] = await Promise.all([token0.name(), token1.name()]);
                        const tokenToFetchPairFor = token0Address === tokenAddress ? token1Address : token0Address; // Determine which token to fetch the pair for


                        balanceData.type = 'PAIR';
                        balanceData.additional_token_name = token0Address !== tokenAddress ? token0Name : token1Name;
                        balanceData.additional_token_address = token0Address !== tokenAddress ? token0Address : token1Address;

                        // Handling valueLinks for PAIR
                        const pairedWithWETH = await getPairAddress(provider, uniswap_factory_abi, UNISWAP_FACTORY_ADDRESS, tokenToFetchPairFor, WETH_ADDRESS);
                        const reserves = await getReservesETH(provider, uniswap_pair_abi, pairedWithWETH, WETH_ADDRESS);
                        const priceOtherToken = ethers.utils.formatEther(reserves.reserve0) / ethers.utils.formatEther(reserves.reserve1);
                        const pairReserves = await getReserves(provider, uniswap_pair_abi, holderAddress);
                        let valueLinkEntry = {
                            pair_address: holderAddress,
                            token0_content: token0Name,
                            token1_content: token1Name,
                            token0: token0Address,
                            token1: token1Address,
                            reserve0: parseFloat(ethers.utils.formatEther(pairReserves.reserve0)),
                            reserve1: parseFloat(ethers.utils.formatEther(pairReserves.reserve1))
                        };

                        if (token0Address === tokenAddress) {
                            valueLinkEntry.current_price_token0 = resultData.current_price;
                            valueLinkEntry.current_price_token1 = priceOtherToken;
                        } else {
                            valueLinkEntry.current_price_token0 = priceOtherToken;
                            valueLinkEntry.current_price_token1 = resultData.current_price;
                        }
                        valueLinkEntry.TVL = valueLinkEntry.current_price_token0 * valueLinkEntry.reserve0 + valueLinkEntry.current_price_token1 * valueLinkEntry.reserve1;
                        resultData.valuelinks.push(valueLinkEntry);
                    } else {
                        balanceData.type = 'UNKNOWN';
                    }
                } else {
                    const suppliedNickname = await getNicknameForAddress(holderAddress);
                    if (suppliedNickname) {
                        balanceData.nickname = suppliedNickname;
                    }
                }

                return balanceData;
            })
        );

        resultData.balances = balancesData;
        resultData.content = tokenContent;
        resultData.creator_address = creatorName;

        resultData.balances.sort((a, b) => b.balance - a.balance);
        return resultData;

    } catch (error) {
        console.error("Error fetching blockchain data:", error);
        return {};
    }
}
async function getNicknameForAddress(address) {
    // Currently, this function doesn't return any nickname.
    // In the future, you can expand this to fetch or determine nicknames for given addresses.
    return null;
}


async function getTokenName(tokenAddress, simple_token_abi, provider){
    const tokenContract = new ethers.Contract(tokenAddress, simple_token_abi, provider);
    const mainTokenName = await tokenContract.name();
    return mainTokenName;
}
async function getCreatorAddress(tokenContractAddress, provider, simple_token_abi) {
    try {
        const contract = new ethers.Contract(tokenContractAddress, simple_token_abi, provider);
        const transferFilter = contract.filters.Transfer(null, null);
        const logs = await provider.getLogs({
            fromBlock: 0,
            toBlock: 'latest',
            address: tokenContractAddress,
            topics: transferFilter.topics
        });
        
        if (logs.length === 0) {
            console.error("No transfer logs found for this contract");
            return null;
        }
        const firstLog = logs[0];
        const txHash = firstLog.transactionHash;  // This is the transaction hash
        const txDetails = await provider.getTransaction(txHash);
        const creatorAddress = txDetails.from;  // This is the address that created the contract
        return creatorAddress;
    } catch (error) {
        console.error("Error fetching creator address:", error);
        return null;
    }
}
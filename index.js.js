require('dotenv').config();
const axios = require('axios');
const ethers = require('ethers');
const readline = require('readline');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

const logger = {
  info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}[⚠] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.white}[➤] ${msg}${colors.reset}`),
  banner: () => {
    console.log(`${colors.cyan}${colors.bold}`);
    console.log(`-------------------------------------------------`);
    console.log(`   Euclid Testnet Auto Bot - Airdrop Insiders`);
    console.log(`-------------------------------------------------${colors.reset}`);
    console.log();
  }
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

const retry = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      logger.warn(`API retry ${i + 1}/${retries} failed: ${error.message}. Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

const ethersVersion = parseInt(ethers.version.split('.')[0], 10);
const isEthersV6 = ethersVersion >= 6;

async function main() {
  logger.banner();

  try {
    console.log(`${colors.cyan}Menu:${colors.reset}`);
    console.log(`1. ETH - EUCLID (Arbitrum)`);
    console.log(`2. ETH - ANDR (Arbitrum)`);
    console.log(`3. Random Swap (Arbitrum)`);
    console.log(`4. Exit`);
    console.log();

    const swapType = await question(
      `${colors.cyan}Enter menu option (1-4): ${colors.reset}`
    );

    if (swapType === '4') {
      logger.info(`Exiting...`);
      rl.close();
      return;
    }

    if (!['1', '2', '3'].includes(swapType)) {
      logger.error(`Invalid menu option. Please enter a number between 1 and 4.`);
      rl.close();
      return;
    }

    const numTransactions = parseInt(
      await question(`${colors.cyan}Enter number of transactions to perform: ${colors.reset}`)
    );
    const ethAmount = parseFloat(
      await question(`${colors.cyan}Enter ETH amount per transaction: ${colors.reset}`)
    );

    if (isNaN(numTransactions) || isNaN(ethAmount) || numTransactions <= 0 || ethAmount <= 0) {
      logger.error(`Invalid input. Please enter positive numbers.`);
      rl.close();
      return;
    }

    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      logger.error(`Private key not found in .env file`);
      rl.close();
      return;
    }

    let provider, wallet;
    if (isEthersV6) {
      provider = new ethers.JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc');
      wallet = new ethers.Wallet(privateKey, provider);
    } else {
      provider = new ethers.providers.JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc');
      wallet = new ethers.Wallet(privateKey, provider);
    }

    const walletAddress = wallet.address;

    logger.info(`Connected to wallet: ${colors.yellow}${walletAddress}`);
    logger.info(`Network: ${colors.yellow}Arbitrum Sepolia (Chain ID: 421614)`);
    console.log();

    const contractAddress = '0x7f2CC9FE79961f628Da671Ac62d1f2896638edd5';

    const balance = await provider.getBalance(walletAddress);
    let requiredEth, gasEstimatePerTx, totalRequiredEth;

    if (isEthersV6) {
      requiredEth = ethers.parseEther(ethAmount.toString()) * BigInt(numTransactions);
      gasEstimatePerTx = ethers.parseEther('0.00009794');
      totalRequiredEth = requiredEth + gasEstimatePerTx * BigInt(numTransactions);
    } else {
      requiredEth = ethers.utils.parseEther((numTransactions * ethAmount).toString());
      gasEstimatePerTx = ethers.utils.parseUnits('0.00009794', 'ether');
      totalRequiredEth = requiredEth.add(gasEstimatePerTx.mul(numTransactions));
    }

    const isBalanceInsufficient = isEthersV6
      ? balance < totalRequiredEth
      : balance.lt(totalRequiredEth);

    if (isBalanceInsufficient) {
      logger.error(
        `Insufficient ETH balance. Required: ${
          isEthersV6 ? ethers.formatEther(totalRequiredEth) : ethers.utils.formatEther(totalRequiredEth)
        } ETH, Available: ${
          isEthersV6 ? ethers.formatEther(balance) : ethers.utils.formatEther(balance)
        } ETH`
      );
      rl.close();
      return;
    }

    logger.warn(`Summary:`);
    logger.step(`Swap type: ${colors.yellow}${
      swapType === '1' ? 'ETH to EUCLID' : swapType === '2' ? 'ETH to ANDR' : 'Random (EUCLID/ANDR)'
    }`);
    logger.step(`Number of transactions: ${colors.yellow}${numTransactions}`);
    logger.step(`ETH per transaction: ${colors.yellow}${ethAmount} ETH`);
    logger.step(`Total ETH (incl. gas): ${colors.yellow}${
      isEthersV6 ? ethers.formatEther(totalRequiredEth) : ethers.utils.formatEther(totalRequiredEth)
    } ETH`);
    console.log();

    const confirm = await question(`${colors.yellow}Continue with these settings? (y/n): ${colors.reset}`);

    if (confirm.toLowerCase() !== 'y') {
      logger.error(`Operation cancelled by user.`);
      rl.close();
      return;
    }

    const isRandomSwap = swapType === '3';
    for (let i = 0; i < numTransactions; i++) {
      const isEuclidSwap = isRandomSwap ? (i % 2 === 0 ? true : false) : swapType === '1';
      const swapDescription = isEuclidSwap ? 'ETH to EUCLID' : 'ETH to ANDR';

      logger.loading(`Transaction ${i + 1}/${numTransactions} (${swapDescription}):`);

      try {
        logger.step(`Fetching swap quote for amount_out...`);

        const targetChainUid = isEuclidSwap ? 'optimism' : 'andromeda';
        const targetToken = isEuclidSwap ? 'euclid' : 'andr';
        const defaultAmountOut = isEuclidSwap ? '11580659' : '1471120';
        const swapRoute = isEuclidSwap ? ['eth', 'euclid'] : ['eth', 'euclid', 'usdc', 'usdt', 'andr'];
        const amountOutHops = isEuclidSwap
          ? [`euclid: ${defaultAmountOut}`]
          : ['euclid: 14610474', 'usdc: 205013506', 'usdt: 399847130', `andr: ${defaultAmountOut}`];
        const gasLimit = isEuclidSwap ? 812028 : 1500000; // Increased for ANDR
        const targetAddress = walletAddress;

        const quotePayload = {
          amount_in: (isEthersV6
            ? ethers.parseEther(ethAmount.toString())
            : ethers.utils.parseEther(ethAmount.toString())).toString(),
          asset_in: {
            token: 'eth',
            token_type: {
              __typename: 'NativeTokenType',
              native: {
                __typename: 'NativeToken',
                denom: 'eth'
              }
            }
          },
          slippage: '500',
          cross_chain_addresses: [
            {
              user: {
                address: targetAddress,
                chain_uid: targetChainUid
              },
              limit: {
                less_than_or_equal: defaultAmountOut
              }
            }
          ],
          partnerFee: {
            partner_fee_bps: 10,
            recipient: walletAddress
          },
          sender: {
            address: walletAddress,
            chain_uid: 'arbitrum'
          },
          swap_path: {
            path: [
              {
                route: swapRoute,
                dex: 'euclid',
                amount_in: (isEthersV6
                  ? ethers.parseEther(ethAmount.toString())
                  : ethers.utils.parseEther(ethAmount.toString())).toString(),
                amount_out: '0',
                chain_uid: 'vsl',
                amount_out_for_hops: swapRoute.map((token) => `${token}: 0`)
              }
            ],
            total_price_impact: '0.00'
          }
        };

        const quoteResponse = await retry(() =>
          axios.post(
            'https://testnet.api.euclidprotocol.com/api/v1/execute/astro/swap',
            quotePayload,
            {
              headers: {
                accept: 'application/json, text/plain, */*',
                'content-type': 'application/json',
                Referer: 'https://testnet.euclidswap.io/'
              }
            }
          )
        );

        logger.info(`Quote received`);

        const amountOut = quoteResponse.data.meta
          ? JSON.parse(quoteResponse.data.meta).swaps.path[0].amount_out
          : defaultAmountOut;
        if (!amountOut || amountOut === '0') {
          logger.error(`Invalid amount_out in API response. Skipping transaction.`);
          continue;
        }

        logger.step(`Building swap transaction...`);

        const swapPayload = {
          amount_in: (isEthersV6
            ? ethers.parseEther(ethAmount.toString())
            : ethers.utils.parseEther(ethAmount.toString())).toString(),
          asset_in: {
            token: 'eth',
            token_type: {
              __typename: 'NativeTokenType',
              native: {
                __typename: 'NativeToken',
                denom: 'eth'
              }
            }
          },
          slippage: '500',
          cross_chain_addresses: [
            {
              user: {
                address: targetAddress,
                chain_uid: targetChainUid
              },
              limit: {
                less_than_or_equal: amountOut
              }
            }
          ],
          partnerFee: {
            partner_fee_bps: 10,
            recipient: walletAddress
          },
          sender: {
            address: walletAddress,
            chain_uid: 'arbitrum'
          },
          swap_path: {
            path: [
              {
                route: swapRoute,
                dex: 'euclid',
                amount_in: (isEthersV6
                  ? ethers.parseEther(ethAmount.toString())
                  : ethers.utils.parseEther(ethAmount.toString())).toString(),
                amount_out: amountOut,
                chain_uid: 'vsl',
                amount_out_for_hops: isEuclidSwap
                  ? [`euclid: ${amountOut}`]
                  : [
                      `euclid: ${Math.floor(parseInt(amountOut) * 9.934)}`,
                      `usdc: ${Math.floor(parseInt(amountOut) * 139.36)}`,
                      `usdt: ${Math.floor(parseInt(amountOut) * 271.87)}`,
                      `andr: ${amountOut}`
                    ]
              }
            ],
            total_price_impact: '0.00'
          }
        };

        const swapResponse = await retry(() =>
          axios.post(
            'https://testnet.api.euclidprotocol.com/api/v1/execute/astro/swap',
            swapPayload,
            {
              headers: {
                accept: 'application/json, text/plain, */*',
                'content-type': 'application/json',
                Referer: 'https://testnet.euclidswap.io/'
              }
            }
          )
        );

        logger.info(`Swap response received`);

        let txData = swapResponse.data.msgs?.[0]?.data;
        if (!txData) {
          logger.error(
            `Calldata not found in API response (expected in msgs[0].data). Please check the API response structure and update the script. Skipping transaction.`
          );
          continue;
        }

        if (swapResponse.data.sender?.address.toLowerCase() !== walletAddress.toLowerCase()) {
          logger.error(
            `API returned incorrect sender address: ${swapResponse.data.sender.address}. Expected: ${walletAddress}. Skipping transaction.`
          );
          continue;
        }

        logger.loading(`Executing swap transaction...`);

        const tx = {
          to: contractAddress,
          value: isEthersV6
            ? ethers.parseEther(ethAmount.toString())
            : ethers.utils.parseEther(ethAmount.toString()),
          data: txData,
          gasLimit: gasLimit,
          nonce: await provider.getTransactionCount(walletAddress, 'pending')
        };

        if (isEthersV6) {
          tx.maxFeePerGas = ethers.parseUnits('0.1', 'gwei');
          tx.maxPriorityFeePerGas = ethers.parseUnits('0.1', 'gwei');
        } else {
          tx.maxFeePerGas = ethers.utils.parseUnits('0.1', 'gwei');
          tx.maxPriorityFeePerGas = ethers.utils.parseUnits('0.1', 'gwei');
        }

        try {
          const gasEstimate = await provider.estimateGas(tx);
          logger.info(`Estimated gas: ${gasEstimate.toString()}`);
          tx.gasLimit = isEthersV6
            ? (gasEstimate * 110n) / 100n
            : gasEstimate.mul(110).div(100);
        } catch (gasError) {
          logger.warn(`Gas estimation failed: ${gasError.message}. Using manual gas limit: ${gasLimit}`);
        }

        try {
          await provider.call(tx);
        } catch (simulationError) {
          logger.error(`Transaction simulation failed: ${simulationError.reason || simulationError.message}`);
          continue;
        }

        const txResponse = await wallet.sendTransaction(tx);
        logger.info(`Transaction sent! Hash: ${colors.yellow}${txResponse.hash}`);

        logger.loading(`Waiting for confirmation...`);
        const receipt = await txResponse.wait();

        if (receipt.status === 1) {
          logger.success(`Transaction successful! Gas used: ${receipt.gasUsed.toString()}`);

          await retry(() =>
            axios.post(
              'https://testnet.euclidswap.io/api/intract-track',
              {
                chain_uid: 'arbitrum',
                tx_hash: txResponse.hash,
                wallet_address: walletAddress,
                referral_code: 'EUCLIDEAN667247',
                type: 'swap'
              },
              {
                headers: {
                  accept: 'application/json, text/plain, */*',
                  'content-type': 'application/json',
                  Referer: 'https://testnet.euclidswap.io/swap?ref=EUCLIDEAN667247'
                }
              }
            )
          );

          logger.success(`Transaction tracked with Euclid`);
          logger.step(`View transaction: ${colors.cyan}https://sepolia.arbiscan.io/tx/${txResponse.hash}`);
        } else {
          logger.error(`Transaction failed!`);
        }

        if (i < numTransactions - 1) {
          const delay = 5000 + Math.floor(Math.random() * 5000);
          logger.loading(`Waiting ${delay / 1000} seconds before next transaction...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } catch (error) {
        logger.error(`Error during transaction: ${error.message}`);
        if (error.reason) {
          logger.error(`Revert reason: ${error.reason}`);
        }
      }
      console.log();
    }

    logger.success(`${colors.bold}All transactions completed!`);
  } catch (error) {
    logger.error(`Fatal error: ${error.message}`);
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  logger.error(`Fatal error: ${error.message}`);
  rl.close();
});
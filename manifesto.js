const axios = require('axios');
const ethers = require('ethers');
const readline = require('readline');
const fs = require('fs').promises;
const userAgents = require('user-agents');

const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  white: "\x1b[37m",
  bold: "\x1b[1m"
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
    console.log(`---------------------------------------------`);
    console.log(`  Boundless Manifesto Bot - Airdrop Insiders `);
    console.log(`---------------------------------------------${colors.reset}`);
    console.log();
  }
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const getRandomUserAgent = () => new userAgents().toString();

const getSignatureCount = async () => {
  try {
    const headers = {
      'accept': '*/*',
      'accept-language': 'en-US,en;q=0.9',
      'priority': 'u=1, i',
      'sec-ch-ua': getRandomUserAgent(),
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site',
      'sec-gpc': '1',
      'Referer': 'https://manifesto.beboundless.xyz/'
    };

    const response = await axios.get('https://boundless-signal.vercel.app/api/manifesto/signatures-amount', { headers });
    return response.data.count;
  } catch (error) {
    logger.error(`Failed to fetch signature count: ${error.message}`);
    return null;
  }
};

const signManifesto = async (wallet) => {
  try {
    const message = "I have read the Boundless manifesto.";
    const signature = await wallet.signMessage(message);
    
    const headers = {
      'accept': '*/*',
      'accept-language': 'en-US,en;q=0.9',
      'priority': 'u=1, i',
      'sec-ch-ua': getRandomUserAgent(),
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site',
      'sec-gpc': '1',
      'Referer': 'https://manifesto.beboundless.xyz/'
    };

    const url = `https://boundless-signal.vercel.app/api/manifesto?signature=${signature}&address=${wallet.address}&message=${encodeURIComponent(message)}`;
    
    const response = await axios.get(url, { headers });
    
    if (response.data.success) {
      logger.success(`Successfully signed manifesto for address: ${wallet.address}`);
      return { address: wallet.address, privateKey: wallet.privateKey, signature };
    } else {
      logger.error(`Failed to sign manifesto for address: ${wallet.address}`);
      return null;
    }
  } catch (error) {
    logger.error(`Error signing manifesto for ${wallet.address}: ${error.message}`);
    return null;
  }
};

const saveWallets = async (wallets) => {
  try {
    await fs.writeFile('wallets.json', JSON.stringify(wallets, null, 2));
    logger.success('Wallets saved to wallets.json');
  } catch (error) {
    logger.error(`Failed to save wallets: ${error.message}`);
  }
};

const main = async () => {
  logger.banner();
  
  const signatureCount = await getSignatureCount();
  if (signatureCount) {
    logger.info(`Current signature count: ${signatureCount}`);
  }

  rl.question('Enter the number of wallets to create and sign: ', async (input) => {
    const numWallets = parseInt(input);
    if (isNaN(numWallets) || numWallets <= 0) {
      logger.error('Please enter a valid number');
      rl.close();
      return;
    }

    const signedWallets = [];
    
    for (let i = 1; i <= numWallets; i++) {
      logger.step(`Processing wallet ${i}/${numWallets}`);
      
      const wallet = ethers.Wallet.createRandom();
      logger.loading(`Created wallet: ${wallet.address}`);
      
      const result = await signManifesto(wallet);
      if (result) {
        signedWallets.push(result);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (signedWallets.length > 0) {
      await saveWallets(signedWallets);
      logger.success(`Successfully processed ${signedWallets.length}/${numWallets} wallets`);
    } else {
      logger.error('No wallets were successfully processed');
    }

    rl.close();
  });
};

main().catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  rl.close();
});
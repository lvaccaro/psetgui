import storage from '../storage/Storage';
import Constants from '../config/Constants';

// use testnet or mainnet. enable true for testing
//global.useTestnet = true;

// const WALLETS = global.useTestnet
//   ? Constants.TESTNET_WALLETS
//   : Constants.WALLETS;
const WALLETS = Constants.TESTNET_WALLETS;

const getWallets = async () => {
  const wallets = (await storage.getItem(WALLETS)) || [];
  return wallets;
};

const createWallet = async wallet => {
  const wallets = await getWallets();
  wallets.push(wallet);
  await storage.storeItem(WALLETS, wallets);
};

const deleteWallet = async wallet => {
  const wallets = await getWallets();
  const newWallets = wallets.filter(w => w.id !== wallet.id);
  await storage.storeItem(WALLETS, newWallets);
};

const getDefaultWallet = async () => {
  console.log('getDefaultWallet');
  const wallets = await getWallets();

  if (wallets.length === 0) return null;

  return wallets[0];
};

const getWallet = async id => {
  const wallets = await getWallets();
  return wallets.find(w => w.id === id);
};

const isWalletExist = async xpub => {
  const wallets = await getWallets();
  return wallets.some(w => w.xpub === xpub);
};

const resetWallets = async () => {
  return await storage.storeItem(WALLETS, []);
};

const storeTransactions = async (walletId, transactions) => {
  try {
    if (!walletId) return;
    await storage.storeItem(
      `transactions_${walletId}`,
      JSON.stringify(transactions),
    );
  } catch (error) {
    console.error('Error storing transactions:', error);
  }
};

const getStoredTransactions = async walletId => {
  try {
    if (!walletId) return [];

    const transactions = await storage.getItem(`transactions_${walletId}`);
    return transactions ? JSON.parse(transactions) : [];
  } catch (error) {
    console.error('Error getting stored transactions:', error);
    return [];
  }
};

const storeBalance = async (walletId, balance) => {
  try {
    if (!walletId) return null;

    await storage.storeItem(`balance_${walletId}`, JSON.stringify(balance));
  } catch (error) {
    console.error('Error storing balance:', error);
  }
};

const getStoredBalance = async walletId => {
  try {
    if (!walletId) return null;

    const balance = await storage.getItem(`balance_${walletId}`);
    return balance ? JSON.parse(balance) : 0;
  } catch (error) {
    console.error('Error getting stored balance:', error);
    return 0;
  }
};

export {
  getWallets,
  createWallet,
  deleteWallet,
  getWallet,
  getDefaultWallet,
  isWalletExist,
  resetWallets,
  storeTransactions,
  getStoredTransactions,
  storeBalance,
  getStoredBalance,
};

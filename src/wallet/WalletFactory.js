import {
  Wollet,
  Client,
  Signer,
  Mnemonic,
  Network,
  WolletDescriptor,
  TxBuilder,
  Bip,
  Pset,
} from 'lwk-rn';

import * as bip39 from 'bip39';
import uuid from 'react-native-uuid';
import Constants from '../config/Constants';
import {
  getWallets,
  createWallet,
  deleteWallet,
  getDefaultWallet,
  getWallet,
  isWalletExist,
  resetWallets,
  getStoredTransactions,
  storeTransactions,
  storeBalance,
  getStoredBalance,
} from '../services/WalletService';
import Transaction from '../models/Transaction';

let signerInstance = null;
let wolletInstance = null;
let clientInstance = null;
let builderInstance = null;

const getSignerInstance = async () => {
  console.log('getSignerInstance');
  if (!signerInstance) {
    const wallet = await getDefaultWallet();
    const {mnemonic} = JSON.parse(wallet);
    if (!mnemonic) {
      return null;
    }
    signerInstance = new Signer(new Mnemonic(mnemonic), Network.testnet());
  }
  return signerInstance;
};

const getWolletInstance = async () => {
  console.log('getWolletInstance');
  if (!wolletInstance) {
    const wallet = await getDefaultWallet();
    if (!wallet) {
      return null;
    }
    const {descriptor} = JSON.parse(wallet);
    console.log('Descriptor',descriptor);
    const desc = new WolletDescriptor(descriptor);
    console.log('WolletDescriptor',descriptor.toString());
    console.log('Wollet');
    wolletInstance = new Wollet(Network.testnet(), desc, undefined);
    console.log('updateWallet');
    await updateWallet(wolletInstance);
  }
  console.log('ready wolletInstance');
  return wolletInstance;
};

const getClientInstance = async () => {
  console.log('getClientInstance');
  if (!clientInstance) {
    clientInstance = await Network.testnet().defaultElectrumClient();
  }
  return clientInstance;
};

const getBuilderInstance = async () => {
  if (!builderInstance) {
    builderInstance = await new TxBuilder(Network.testnet());
  }
  return builderInstance;
};

const GetSavedTransactions = async () => {
  console.log('GetSavedTransactions');
  const wallet = await getDefaultWallet();
  if (!wallet) return [];

  const parsedWallet = JSON.parse(wallet);
  const transactions = await getStoredTransactions(parsedWallet.id);
  return transactions;
};

const GetSavedBalance = async () => {
  console.log('GetSavedBalance');
  const wallet = await getDefaultWallet();
  if (!wallet) return null;

  const parsedWallet = JSON.parse(wallet);
  const balance = await getStoredBalance(parsedWallet.id);
  const totalBalance = Object.values(balance).reduce(
    (sum, balance) => sum + balance,
    0,
  );

  return totalBalance;
};

const CreateWallet = async () => {
  try {
    // Generate a mnemonic using BIP-39
    console.log('bip39.generateMnemonic()');
    //const mnemonic = bip39.generateMnemonic();
    //console.log('mnemonic:', mnemonic);
     const mnemonic =
       'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    signerInstance = new Signer(new Mnemonic(mnemonic), Network.testnet());
    console.log('Signer created');

    // const mnemonic1 = await signerInstance.mnemonic();
    // console.log('mnemonic:', mnemonic1);

    // const bip = await new Bip().newBip84();
    // console.log('BIP created');
    // await bip.newBip84(); // Use BIP-84 for Native SegWit (Bech32) addresses
    // console.log('BIP ID:', bip.id);

    // // Get the key origin information
    // const keyOrigin = await signerInstance.keyoriginXpub(bip);
    // console.log('keyOrigin:', keyOrigin);

    //const mnemonic = await signer.mnemonic();
    //console.log('mnemonic:', mnemonic);
    // use random number string for xpub now. will be replaced with actual xpub once it is available as par of the signer
    const xpub = Math.floor(Math.random() * 100000).toString();

    if (await isWalletExist(xpub)) {
      console.log('Wallet already exists');
      return;
    }

    const descriptor = await signerInstance.wpkhSlip77Descriptor();
    const descriptorString = await descriptor.toString();

    const id = uuid.v4();

    await createWallet(
      JSON.stringify({
        id: id,
        mnemonic: mnemonic,
        xpub: xpub,
        descriptor: descriptorString,
      }),
    );
  } catch (error) {
    console.error(error);
  }
};

const updateWallet = async wollet => {
  console.log('updateWallet');
  const client = await getClientInstance();
  const update = await client.fullScan(wollet);
  wollet.applyUpdate(update);
};

const GetWollet = async () => {
  return getWolletInstance();
};

const IsWalletExist = async () => {
  const wallet = await getDefaultWallet();
  if (!wallet) {
    return false;
  }
  return true;
};

const GetNewAddress = async () => {
  console.log('GetNewAddress');
  const address = (await getWolletInstance()).address(undefined);
  const txt = address.address().toString();
  console.log('address:', txt);
  return txt;
};

const GetTransactions = async () => {
  console.log('GetTransactions');
  const wallet = await getWolletInstance();
  await updateWallet(wallet);
  const txs = await wallet.transactions();

  const newTransactions = txs.map(tx => {
    var balance = {}
    tx.balance().forEach((value, key) => {
      if (balance[key.toString()] === undefined) {
        balance[key.toString()] = 0;
      }
      balance[key.toString()] += Number(value);
    });
    return new Transaction({
      balance: balance,
      fee: Number(tx.fee()),
      height: tx.height(),
      date: tx.timestamp(),
      type: tx.type(),
      txid: tx.txid(),
      date: new Date(tx.timestamp() * 1000),
      tx: tx.tx().toString(),
    });
  });

  const savedWallet = await getDefaultWallet();
  const parsedSavedWallet = JSON.parse(savedWallet);

  // Retrieve existing transactions from AsyncStorage
  const storedTransactions = await getStoredTransactions(parsedSavedWallet?.id);

  // Filter out new transactions
  const existingTransactionIds = storedTransactions?.map(tx => tx.txid);
  const uniqueNewTransactions = newTransactions.filter(
    tx => !existingTransactionIds.includes(tx.txid),
  );

  // Combine existing and new transactions
  const updatedTransactions = [...storedTransactions, ...uniqueNewTransactions];

  // Store the updated transactions back to AsyncStorage
  await storeTransactions(parsedSavedWallet?.id, updatedTransactions);

  return updatedTransactions;
};

const GetBalance = async () => {
  console.log('GetBalance');
  const wollet = await getWolletInstance();
  await updateWallet(wollet);
  const res = await wollet.balance();
  console.log('balance:', res);
  var balance = {}
  res.forEach((value, key) => {
    if (balance[key.toString()] === undefined) {
      balance[key.toString()] = 0;
    }
    balance[key.toString()] += Number(value);
  });
  // Store the balance in AsyncStorage
  const savedWallet = await getDefaultWallet();
  const parsedSavedWallet = JSON.parse(savedWallet);

  await storeBalance(parsedSavedWallet?.id, balance);

  return balance;
};

const ResetWallets = async () => {
  console.log('ResetWallets');
  return await resetWallets();
};

const BroadcastTransaction = async (address, satoshis) => {
  console.log('BroadcastTransaction');
  try {
    const wollet = await getWolletInstance();
    const builder = await getBuilderInstance();
    const signer = await getSignerInstance();
    const client = await getClientInstance();

    const fee_rate = 100; // this is the sat/vB * 100 fee rate. Example 280 would equal a fee rate of .28 sat/vB. 100 would equal .1 sat/vB

    await builder.addLbtcRecipient(address, parseFloat(satoshis));
    await builder.feeRate(fee_rate);

    let pset = await builder.finish(wollet);
    const psetAsString = await pset.asString();
    console.log('Unsigned PSET', psetAsString);
    let signed_pset = await signer.sign(pset);
    console.log('SIGNED PSET:', await signed_pset.asString());
    let finalized_pset = await wollet.finalize(signed_pset);
    const tx = await finalized_pset.extractTx();

    await client.broadcast(tx);
    const txId = await tx.txId();

    console.log('BROADCASTED TX!\nTXID: {:?}', txId);
    return txId;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const ValidateAddress = async address => {
  console.log('ValidateAddress');
  try {
    const builder = await getBuilderInstance();
    await builder.addLbtcRecipient(address, 1000);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const GetMnemonic = async () => {
  console.log('GetMnemonic');
  const wallet = await getDefaultWallet();
  if (!wallet) {
    return null;
  }
  return JSON.parse(wallet).mnemonic;
};

const CreatePSETFromBase64 = async pset => {
  console.log('CreatePSETFromBase64');
  try {
    const psetInstance = new Pset(pset);
    return psetInstance;
  } catch (error) {
    console.error('PSET validation failed:', error);
    return null;
  }
};

const ExtractTransaction = async pset => {
  console.log('ExtractTransaction');
  try {
    const tx = await pset.extractTx();
    return tx;
  } catch (error) {
    console.error('Failed to extract transaction:', error);
    return null;
  }
};

const GetWolletInfo = async () => {
  console.log('GetWolletInfo');
  const signer = await getSignerInstance();

  const descriptor = await signerInstance.wpkhSlip77Descriptor();
  const descriptorString = await descriptor.asString();

  const bip = await new Bip();
  const bip49 = await bip.newBip49();
  const bip84 = await bip.newBip84();
  const bip87 = await bip.newBip87();
  const bip49Xpub = await signer.keyoriginXpub(bip);
  console.log(bip49Xpub);

  const bip84Xpub = await signer.keyoriginXpub(bip84);
  const bip87Xpub = await signer.keyoriginXpub(bip87);
  return {descriptorString, bip49Xpub, bip84Xpub, bip87Xpub};
};

export {
  CreateWallet,
  GetNewAddress,
  GetTransactions,
  GetBalance,
  GetWollet,
  ResetWallets,
  IsWalletExist,
  BroadcastTransaction,
  ValidateAddress,
  GetMnemonic,
  GetSavedBalance,
  GetSavedTransactions,
  CreatePSETFromBase64,
  ExtractTransaction,
  GetWolletInfo,
};

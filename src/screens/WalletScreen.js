import React, {useEffect, useState, useContext} from 'react';
import {View, StyleSheet, Text, ScrollView, RefreshControl} from 'react-native';

import colors from '../config/Colors';
import TransactionButtons from '../components/TransactionButtons';
import TopBar from '../components/TopBar';
import Transactions from './Transactions';
import {
  GetTransactions,
  GetNewAddress,
  GetBalance,
  GetSavedBalance,
  GetSavedTransactions,
} from '../wallet/WalletFactory';
import Transaction from '../models/Transaction';
import UnitConverter from '../helpers/UnitConverter';
import Constants from '../config/Constants';
import {AppContext} from '../context/AppContext';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function WalletScreen({navigation}) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const {preferredBitcoinUnit} = useContext(AppContext);

  const getTransactions = async () => {
    try {
      const transactionsData = await GetTransactions();
      const mappedTransactions = transactionsData.map(
        tx => new Transaction(tx),
      );

      setTransactions(mappedTransactions);
    } catch (error) {
      console.error(error);
    }
  };

  const getBalance = async () => {
    try {
      const walletBalances = await GetBalance();
      const totalBalance = Object.values(walletBalances).reduce(
        (sum, balance) => sum + balance,
        0,
      );

      setBalance(totalBalance);
    } catch (error) {
      console.error(error);
    }
  };

  const onRefresh = async () => {
    setLoading(true);
    await sleep(2000);

    try {
      await getBalance();
      await getTransactions();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadStoredData = async () => {
    try {
      const storedTransactions = await GetSavedTransactions();
      const storedBalance = await GetSavedBalance();
      setTransactions(storedTransactions);
      setBalance(storedBalance);
    } catch (error) {
      console.error('Failed to load stored data', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await loadStoredData();
      await getBalance();
      await getTransactions();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onSend = async () => {
    navigation.navigate('SendScreen', {
      balance: displayBalanceInPreferredUnit(),
    });
  };

  const onReceive = async () => {
    const description = await GetNewAddress();
    navigation.navigate('Receive', {address: description});
  };

  const onTransactionDetails = transaction => {
    navigation.navigate('TransactionDetails', {transaction});
  };

  const displayBalanceInPreferredUnit = () => {
    const convertedDenominationAmount =
      UnitConverter.convertToPreferredBTCDenominator(
        balance,
        preferredBitcoinUnit,
      );
    return convertedDenominationAmount;
  };

  return (
    <View style={styles.container}>
      <View style={styles.balanceRow}>
        <TopBar title="Balance" />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            tintColor={colors.white}
          />
        }>
        <View style={[styles.headerRow]}>
          <View style={[styles.balanceContainer]}>
            <Text style={styles.balance}>
              {displayBalanceInPreferredUnit() || '0'}
            </Text>
            <Text style={styles.denomination}>{preferredBitcoinUnit}</Text>
          </View>
        </View>
        <View style={styles.placeholder}>
          <View style={[styles.transactionButtonsContainer]}>
            <TransactionButtons
              onSendPress={onSend}
              onReceivePress={onReceive}
            />
          </View>
        </View>
        <Transactions
          transactions={transactions}
          onTransactionDetail={onTransactionDetails}
          onRefresh={onRefresh}
          denomination={preferredBitcoinUnit}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.appBackground,
  },
  balanceRow: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    paddingTop: 50,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.cardBackground,
  },
  headerRow: {
    paddingTop: 20,
    paddingHorizontal: 20,
    height: 180,
    width: '100%',
    backgroundColor: colors.cardBackground,
  },
  balanceContainer: {
    alignItems: 'center',
  },
  balance: {
    fontSize: 35,
    color: colors.white,
  },
  denomination: {
    fontSize: 15,
    color: colors.textGray,
    marginTop: 5,
  },
  placeholder: {
    //height: 50,
    backgroundColor: colors.appBackground,
  },
  transactionButtonsContainer: {
    alignItems: 'center',
    marginTop: -65,
    backgroundColor: colors.appBackground,
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 5,
    borderColor: colors.textGray,
    borderWidth: 0.5,
  },
});

export default WalletScreen;

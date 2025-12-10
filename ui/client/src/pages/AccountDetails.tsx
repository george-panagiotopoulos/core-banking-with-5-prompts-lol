import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAccount, getAccountTransactions, getAccountLedger } from '../api/client';
import { Account, Transaction, LedgerEntry, TransactionStatus, EntryType, AccountStatus } from '../types';

const AccountDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'transactions' | 'ledger'>('transactions');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadAccountData();
    }
  }, [id]);

  const loadAccountData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const [accountData, txnData, ledgerData] = await Promise.all([
        getAccount(id),
        getAccountTransactions(id),
        getAccountLedger(id)
      ]);
      setAccount(accountData);
      setTransactions(txnData.data);
      setLedgerEntries(ledgerData.data);
      setError(null);
    } catch (err) {
      setError('Failed to load account details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusClass = (status: TransactionStatus | AccountStatus) => {
    switch (status) {
      case TransactionStatus.COMPLETED:
      case AccountStatus.ACTIVE:
        return 'status-completed';
      case TransactionStatus.PENDING:
      case AccountStatus.SUSPENDED:
        return 'status-pending';
      case TransactionStatus.FAILED:
      case AccountStatus.CLOSED:
      case AccountStatus.FROZEN:
        return 'status-failed';
      default:
        return '';
    }
  };

  if (loading) {
    return <div className="loading">Loading account details...</div>;
  }

  if (error || !account) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error || 'Account not found'}</p>
        <Link to="/accounts" className="btn btn-primary">Back to Accounts</Link>
      </div>
    );
  }

  return (
    <div className="page account-details">
      <header className="page-header">
        <div>
          <Link to="/accounts" className="back-link">&larr; Back to Accounts</Link>
          <h1>{account.customerName}</h1>
          <p className="mono">{account.accountNumber}</p>
        </div>
        <span className={`status-badge large ${getStatusClass(account.status)}`}>
          {account.status}
        </span>
      </header>

      <div className="account-summary">
        <div className="summary-card balance">
          <span className="label">Current Balance</span>
          <span className={`value ${account.balance < 0 ? 'negative' : ''}`}>
            {formatCurrency(account.balance, account.currency)}
          </span>
        </div>
        <div className="summary-card">
          <span className="label">Available Balance</span>
          <span className="value">{formatCurrency(account.availableBalance, account.currency)}</span>
        </div>
        <div className="summary-card">
          <span className="label">Overdraft Limit</span>
          <span className="value">{formatCurrency(account.overdraftLimit, account.currency)}</span>
        </div>
        <div className="summary-card">
          <span className="label">Product</span>
          <span className="value small">{account.productName}</span>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Account Information</h2>
        </div>
        <div className="card-content info-grid">
          <div className="info-item">
            <span className="label">Account ID</span>
            <span className="value mono">{account.id}</span>
          </div>
          <div className="info-item">
            <span className="label">Customer ID</span>
            <span className="value mono">{account.customerId}</span>
          </div>
          <div className="info-item">
            <span className="label">Currency</span>
            <span className="value">{account.currency}</span>
          </div>
          <div className="info-item">
            <span className="label">Created</span>
            <span className="value">{formatDate(account.createdAt)}</span>
          </div>
          <div className="info-item">
            <span className="label">Last Updated</span>
            <span className="value">{formatDate(account.updatedAt)}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            Transactions ({transactions.length})
          </button>
          <button
            className={`tab ${activeTab === 'ledger' ? 'active' : ''}`}
            onClick={() => setActiveTab('ledger')}
          >
            Ledger Entries ({ledgerEntries.length})
          </button>
        </div>

        {activeTab === 'transactions' && (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center">No transactions</td>
                </tr>
              ) : (
                transactions.map((txn) => {
                  const isOutgoing = txn.sourceAccountId === account.id;
                  return (
                    <tr key={txn.id}>
                      <td>{formatDate(txn.createdAt)}</td>
                      <td><span className="transaction-type">{txn.type}</span></td>
                      <td>{txn.description}</td>
                      <td className={`amount ${isOutgoing ? 'negative' : 'positive'}`}>
                        {isOutgoing ? '-' : '+'}{formatCurrency(txn.amount, txn.currency)}
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusClass(txn.status)}`}>
                          {txn.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'ledger' && (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledgerEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center">No ledger entries</td>
                </tr>
              ) : (
                ledgerEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.createdAt)}</td>
                    <td>
                      <span className={`entry-type ${entry.entryType.toLowerCase()}`}>
                        {entry.entryType}
                      </span>
                    </td>
                    <td>{entry.description}</td>
                    <td className={`amount ${entry.entryType === EntryType.CREDIT ? 'negative' : 'positive'}`}>
                      {entry.entryType === EntryType.CREDIT ? '-' : '+'}{formatCurrency(entry.amount, entry.currency)}
                    </td>
                    <td className="amount">{formatCurrency(entry.balance, entry.currency)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AccountDetails;

import React, { useEffect, useState } from 'react';
import { getNostroAccounts, getNostroSummary, getNostroTransactions } from '../../api/client';
import { NostroAccount, NostroTransaction, InternalAccountStatus } from '../../types';

const NostroAccountsTab: React.FC = () => {
  const [accounts, setAccounts] = useState<NostroAccount[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [selectedAccount, setSelectedAccount] = useState<NostroAccount | null>(null);
  const [transactions, setTransactions] = useState<NostroTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [relationshipFilter, setRelationshipFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [currencyFilter, relationshipFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [accountsRes, summaryRes] = await Promise.all([
        getNostroAccounts(
          currencyFilter !== 'all' ? currencyFilter : undefined,
          relationshipFilter !== 'all' ? relationshipFilter : undefined
        ),
        getNostroSummary()
      ]);
      setAccounts(accountsRes.data);
      setSummary(summaryRes);
      setError(null);
    } catch (err) {
      setError('Failed to load nostro accounts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async (account: NostroAccount) => {
    try {
      const response = await getNostroTransactions(account.id);
      setTransactions(response.data);
      setSelectedAccount(account);
    } catch (err) {
      console.error('Failed to load transactions', err);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'badge badge-success';
      case 'INACTIVE': return 'badge badge-warning';
      case 'FROZEN': return 'badge badge-error';
      default: return 'badge';
    }
  };

  const getRelationshipBadge = (relationship: string) => {
    switch (relationship) {
      case 'NOSTRO': return 'badge badge-primary';
      case 'VOSTRO': return 'badge badge-info';
      case 'LORO': return 'badge badge-secondary';
      default: return 'badge';
    }
  };

  const getTxnStatusBadge = (status: string) => {
    switch (status) {
      case 'RECONCILED': return 'badge badge-success';
      case 'SETTLED': return 'badge badge-info';
      case 'PENDING': return 'badge badge-warning';
      case 'DISPUTED': return 'badge badge-error';
      default: return 'badge';
    }
  };

  const currencies = [...new Set(accounts.map(a => a.currency))];

  return (
    <div className="tab-content">
      {summary && (
        <div className="ledger-summary">
          <div className="summary-item">
            <span className="label">Total Accounts</span>
            <span className="value">{summary.totalAccounts}</span>
          </div>
          <div className="summary-item">
            <span className="label">Total Balance (USD Equiv)</span>
            <span className="value">{formatCurrency(summary.totalBalance)}</span>
          </div>
          <div className="summary-item balance">
            <span className="label">Unreconciled</span>
            <span className="value">{formatCurrency(summary.totalUnreconciled)}</span>
          </div>
          <div className="summary-item">
            <span className="label">Currencies</span>
            <span className="value">{Object.keys(summary.byCurrency || {}).length}</span>
          </div>
        </div>
      )}

      <div className="filters">
        <div className="filter-group">
          <label>Currency</label>
          <select value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value)}>
            <option value="all">All Currencies</option>
            {currencies.map(curr => (
              <option key={curr} value={curr}>{curr}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Relationship</label>
          <select value={relationshipFilter} onChange={(e) => setRelationshipFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value="NOSTRO">Nostro</option>
            <option value="VOSTRO">Vostro</option>
            <option value="LORO">Loro</option>
          </select>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Loading nostro accounts...</div>
      ) : (
        <>
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Correspondent Bank</th>
                  <th>BIC</th>
                  <th>Country</th>
                  <th>Currency</th>
                  <th>Type</th>
                  <th>Balance</th>
                  <th>Unreconciled</th>
                  <th>Last Reconciled</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center">No nostro accounts found</td>
                  </tr>
                ) : (
                  accounts.map((account) => (
                    <tr key={account.id} className={selectedAccount?.id === account.id ? 'selected' : ''}>
                      <td className="mono">{account.accountNumber}</td>
                      <td>{account.correspondentBank}</td>
                      <td className="mono">{account.correspondentBIC}</td>
                      <td>{account.country}</td>
                      <td><strong>{account.currency}</strong></td>
                      <td><span className={getRelationshipBadge(account.relationship)}>{account.relationship}</span></td>
                      <td className={`amount ${account.balance >= 0 ? 'debit' : 'credit'}`}>
                        {formatCurrency(account.balance, account.currency)}
                      </td>
                      <td className={`amount ${Math.abs(account.unreconciled) > 0 ? 'credit' : ''}`}>
                        {formatCurrency(account.unreconciled, account.currency)}
                      </td>
                      <td>{formatDate(account.lastReconciled)}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => loadTransactions(account)}
                        >
                          View Txns
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {selectedAccount && (
            <div className="card" style={{ marginTop: '1rem' }}>
              <h3>Transactions - {selectedAccount.correspondentBank} ({selectedAccount.currency})</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Value Date</th>
                    <th>Type</th>
                    <th>Reference</th>
                    <th>Counterparty</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 15).map((txn) => (
                    <tr key={txn.id}>
                      <td>{formatDate(txn.valueDate)}</td>
                      <td><span className="badge">{txn.transactionType}</span></td>
                      <td className="mono">{txn.reference}</td>
                      <td>{txn.counterparty}</td>
                      <td>{txn.description}</td>
                      <td><span className={getTxnStatusBadge(txn.status)}>{txn.status}</span></td>
                      <td className={`amount ${txn.amount >= 0 ? 'debit' : 'credit'}`}>
                        {formatCurrency(txn.amount, txn.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NostroAccountsTab;

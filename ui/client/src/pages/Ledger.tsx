import React, { useEffect, useState } from 'react';
import { getLedgerEntries, getAccounts } from '../api/client';
import { LedgerEntry, Account, EntryType } from '../types';
import InternalAccountsTab from '../components/ledger/InternalAccountsTab';
import NostroAccountsTab from '../components/ledger/NostroAccountsTab';
import PositionManagementTab from '../components/ledger/PositionManagementTab';
import SuspenseAccountsTab from '../components/ledger/SuspenseAccountsTab';
import GeneralLedgerTab from '../components/ledger/GeneralLedgerTab';

type LedgerTab = 'entries' | 'internal' | 'nostro' | 'positions' | 'suspense' | 'general-ledger';

const Ledger: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LedgerTab>('entries');
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [entryTypeFilter, setEntryTypeFilter] = useState<string>('all');

  useEffect(() => {
    if (activeTab === 'entries') {
      loadData();
    }
  }, [accountFilter, entryTypeFilter, activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [entriesRes, accountsRes] = await Promise.all([
        getLedgerEntries(
          accountFilter !== 'all' ? accountFilter : undefined,
          entryTypeFilter !== 'all' ? entryTypeFilter : undefined
        ),
        getAccounts()
      ]);
      setEntries(entriesRes.data);
      setAccounts(accountsRes.data);
      setError(null);
    } catch (err) {
      setError('Failed to load ledger entries');
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

  // Calculate totals
  const totals = entries.reduce(
    (acc, entry) => {
      if (entry.entryType === EntryType.DEBIT) {
        acc.totalDebits += entry.amount;
      } else {
        acc.totalCredits += entry.amount;
      }
      return acc;
    },
    { totalDebits: 0, totalCredits: 0 }
  );

  const renderLedgerEntriesTab = () => (
    <div className="tab-content">
      <div className="ledger-summary">
        <div className="summary-item">
          <span className="label">Total Entries</span>
          <span className="value">{entries.length}</span>
        </div>
        <div className="summary-item debit">
          <span className="label">Total Debits</span>
          <span className="value">{formatCurrency(totals.totalDebits)}</span>
        </div>
        <div className="summary-item credit">
          <span className="label">Total Credits</span>
          <span className="value">{formatCurrency(totals.totalCredits)}</span>
        </div>
        <div className="summary-item balance">
          <span className="label">Net Balance</span>
          <span className="value">{formatCurrency(totals.totalDebits - totals.totalCredits)}</span>
        </div>
      </div>

      <div className="filters">
        <div className="filter-group">
          <label>Account</label>
          <select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}>
            <option value="all">All Accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.accountNumber} - {account.customerName}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Entry Type</label>
          <select value={entryTypeFilter} onChange={(e) => setEntryTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value={EntryType.DEBIT}>Debit</option>
            <option value={EntryType.CREDIT}>Credit</option>
          </select>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Loading ledger entries...</div>
      ) : (
        <div className="card">
          <table className="table ledger-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Account</th>
                <th>Transaction ID</th>
                <th>Description</th>
                <th>Debit</th>
                <th>Credit</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center">No ledger entries found</td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.createdAt)}</td>
                    <td className="mono">{entry.accountNumber}</td>
                    <td className="mono">{entry.transactionId}</td>
                    <td>{entry.description}</td>
                    <td className="amount debit">
                      {entry.entryType === EntryType.DEBIT ? formatCurrency(entry.amount, entry.currency) : '-'}
                    </td>
                    <td className="amount credit">
                      {entry.entryType === EntryType.CREDIT ? formatCurrency(entry.amount, entry.currency) : '-'}
                    </td>
                    <td className="amount">{formatCurrency(entry.balance, entry.currency)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {entries.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={4}><strong>Totals</strong></td>
                  <td className="amount debit"><strong>{formatCurrency(totals.totalDebits)}</strong></td>
                  <td className="amount credit"><strong>{formatCurrency(totals.totalCredits)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );

  const tabs: { id: LedgerTab; label: string }[] = [
    { id: 'entries', label: 'Ledger Entries' },
    { id: 'general-ledger', label: 'General Ledger' },
    { id: 'internal', label: 'Internal Accounts' },
    { id: 'nostro', label: 'Nostro Accounts' },
    { id: 'positions', label: 'Positions' },
    { id: 'suspense', label: 'Suspense' },
  ];

  return (
    <div className="page ledger">
      <header className="page-header">
        <div>
          <h1>Ledger</h1>
          <p>Double-entry bookkeeping and account management</p>
        </div>
      </header>

      <div className="tabs-container">
        <div className="tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'entries' && renderLedgerEntriesTab()}
      {activeTab === 'general-ledger' && <GeneralLedgerTab />}
      {activeTab === 'internal' && <InternalAccountsTab />}
      {activeTab === 'nostro' && <NostroAccountsTab />}
      {activeTab === 'positions' && <PositionManagementTab />}
      {activeTab === 'suspense' && <SuspenseAccountsTab />}

      <style>{`
        .tabs-container {
          margin-bottom: 1.5rem;
        }
        .tabs {
          display: flex;
          gap: 0.25rem;
          border-bottom: 2px solid #e0e0e0;
          padding-bottom: 0;
          overflow-x: auto;
        }
        .tab {
          padding: 0.75rem 1.25rem;
          border: none;
          background: transparent;
          cursor: pointer;
          font-weight: 500;
          color: #666;
          border-bottom: 3px solid transparent;
          margin-bottom: -2px;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .tab:hover {
          color: #1976d2;
          background: #f5f5f5;
        }
        .tab.active {
          color: #1976d2;
          border-bottom-color: #1976d2;
          background: transparent;
        }
        .tab-content {
          padding-top: 0.5rem;
        }
      `}</style>
    </div>
  );
};

export default Ledger;

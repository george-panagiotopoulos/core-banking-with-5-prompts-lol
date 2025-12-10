import React, { useEffect, useState } from 'react';
import { getGLAccounts, getGLEntries, getGLConsolidated, getGLTrialBalance } from '../../api/client';
import { GLAccount, GLEntry, GLConsolidatedEntry, GLTrialBalance } from '../../types';

type ViewMode = 'accounts' | 'entries' | 'consolidated' | 'trial-balance';

const GeneralLedgerTab: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('consolidated');
  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [entries, setEntries] = useState<GLEntry[]>([]);
  const [consolidated, setConsolidated] = useState<GLConsolidatedEntry[]>([]);
  const [trialBalance, setTrialBalance] = useState<GLTrialBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>('all');
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, [viewMode, typeFilter, transactionTypeFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      switch (viewMode) {
        case 'accounts':
          const accountsRes = await getGLAccounts(typeFilter !== 'all' ? typeFilter : undefined);
          setAccounts(accountsRes.data);
          break;
        case 'entries':
          const entriesRes = await getGLEntries(
            undefined,
            transactionTypeFilter !== 'all' ? transactionTypeFilter : undefined
          );
          setEntries(entriesRes.data);
          break;
        case 'consolidated':
          const consolidatedRes = await getGLConsolidated();
          setConsolidated(consolidatedRes.data);
          break;
        case 'trial-balance':
          const tbRes = await getGLTrialBalance();
          setTrialBalance(tbRes);
          break;
      }
    } catch (err) {
      setError('Failed to load general ledger data');
      console.error(err);
    } finally {
      setLoading(false);
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

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'ASSET': return 'badge badge-info';
      case 'LIABILITY': return 'badge badge-warning';
      case 'EQUITY': return 'badge badge-purple';
      case 'REVENUE': return 'badge badge-success';
      case 'EXPENSE': return 'badge badge-error';
      default: return 'badge';
    }
  };

  const toggleExpanded = (type: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedTypes(newExpanded);
  };

  const renderAccountsView = () => (
    <div className="card">
      <div className="filters" style={{ marginBottom: '1rem' }}>
        <div className="filter-group">
          <label>Account Type</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value="ASSET">Assets</option>
            <option value="LIABILITY">Liabilities</option>
            <option value="EQUITY">Equity</option>
            <option value="REVENUE">Revenue</option>
            <option value="EXPENSE">Expenses</option>
          </select>
        </div>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Type</th>
            <th>Category</th>
            <th>Subcategory</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account.id} style={{ paddingLeft: account.level > 1 ? `${account.level * 20}px` : undefined }}>
              <td className="mono">{account.accountCode}</td>
              <td style={{ paddingLeft: account.level > 1 ? `${(account.level - 1) * 20}px` : undefined }}>
                {account.level > 1 && <span style={{ color: '#999' }}>└─ </span>}
                {account.name}
              </td>
              <td><span className={getTypeBadge(account.type)}>{account.type}</span></td>
              <td>{account.category}</td>
              <td>{account.subcategory}</td>
              <td className={`amount ${account.balance >= 0 ? 'debit' : 'credit'}`}>
                {formatCurrency(Math.abs(account.balance))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderEntriesView = () => (
    <div className="card">
      <div className="filters" style={{ marginBottom: '1rem' }}>
        <div className="filter-group">
          <label>Transaction Type</label>
          <select value={transactionTypeFilter} onChange={(e) => setTransactionTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value="DEPOSIT">Deposit</option>
            <option value="WITHDRAWAL">Withdrawal</option>
            <option value="TRANSFER">Transfer</option>
            <option value="PAYMENT">Payment</option>
            <option value="FEE">Fee</option>
            <option value="INTEREST">Interest</option>
          </select>
        </div>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Posting Date</th>
            <th>Account</th>
            <th>Transaction Type</th>
            <th>Description</th>
            <th>Reference</th>
            <th>Debit</th>
            <th>Credit</th>
          </tr>
        </thead>
        <tbody>
          {entries.slice(0, 100).map((entry) => (
            <tr key={entry.id}>
              <td>{formatDate(entry.postingDate)}</td>
              <td>
                <span className="mono">{entry.accountCode}</span>
                <br />
                <small>{entry.accountName}</small>
              </td>
              <td><span className="badge">{entry.transactionType}</span></td>
              <td>{entry.description}</td>
              <td className="mono">{entry.reference}</td>
              <td className="amount debit">{entry.debit > 0 ? formatCurrency(entry.debit) : '-'}</td>
              <td className="amount credit">{entry.credit > 0 ? formatCurrency(entry.credit) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderConsolidatedView = () => (
    <div className="card">
      <h3>Consolidated Entries by Transaction Type</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Transaction Type</th>
            <th>Transactions</th>
            <th>Total Debit</th>
            <th>Total Credit</th>
            <th>Net Amount</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {consolidated.map((item) => (
            <React.Fragment key={item.transactionType}>
              <tr className="consolidated-row">
                <td><strong>{item.transactionType}</strong></td>
                <td>{item.totalTransactions}</td>
                <td className="amount debit">{formatCurrency(item.totalDebit)}</td>
                <td className="amount credit">{formatCurrency(item.totalCredit)}</td>
                <td className={`amount ${item.netAmount >= 0 ? 'debit' : 'credit'}`}>
                  {formatCurrency(item.netAmount)}
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => toggleExpanded(item.transactionType)}
                  >
                    {expandedTypes.has(item.transactionType) ? 'Hide' : 'Show'} Accounts
                  </button>
                </td>
              </tr>
              {expandedTypes.has(item.transactionType) && item.accounts.map((acc) => (
                <tr key={`${item.transactionType}-${acc.accountCode}`} className="account-detail-row">
                  <td style={{ paddingLeft: '2rem' }}>
                    <span className="mono">{acc.accountCode}</span> - {acc.accountName}
                  </td>
                  <td></td>
                  <td className="amount">{acc.debit > 0 ? formatCurrency(acc.debit) : '-'}</td>
                  <td className="amount">{acc.credit > 0 ? formatCurrency(acc.credit) : '-'}</td>
                  <td></td>
                  <td></td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}><strong>Totals</strong></td>
            <td className="amount debit"><strong>{formatCurrency(consolidated.reduce((s, c) => s + c.totalDebit, 0))}</strong></td>
            <td className="amount credit"><strong>{formatCurrency(consolidated.reduce((s, c) => s + c.totalCredit, 0))}</strong></td>
            <td></td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  const renderTrialBalanceView = () => (
    <div className="card">
      {trialBalance && (
        <>
          <div className="trial-balance-header">
            <h3>Trial Balance</h3>
            <span>As of: {formatDate(trialBalance.asOfDate)}</span>
            <span className={`balance-status ${trialBalance.isBalanced ? 'balanced' : 'unbalanced'}`}>
              {trialBalance.isBalanced ? '✓ Balanced' : '✗ Unbalanced'}
            </span>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Account Code</th>
                <th>Account Name</th>
                <th>Type</th>
                <th>Opening Balance</th>
                <th>Debit Movement</th>
                <th>Credit Movement</th>
                <th>Closing Balance</th>
              </tr>
            </thead>
            <tbody>
              {trialBalance.accounts.map((account) => (
                <tr key={account.accountCode}>
                  <td className="mono">{account.accountCode}</td>
                  <td>{account.accountName}</td>
                  <td><span className={getTypeBadge(account.type)}>{account.type}</span></td>
                  <td className="amount">{formatCurrency(Math.abs(account.openingBalance))}</td>
                  <td className="amount debit">{account.debitMovement > 0 ? formatCurrency(account.debitMovement) : '-'}</td>
                  <td className="amount credit">{account.creditMovement > 0 ? formatCurrency(account.creditMovement) : '-'}</td>
                  <td className={`amount ${account.closingBalance >= 0 ? 'debit' : 'credit'}`}>
                    {formatCurrency(Math.abs(account.closingBalance))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}><strong>Totals</strong></td>
                <td className="amount debit"><strong>{formatCurrency(trialBalance.totalDebits)}</strong></td>
                <td className="amount credit"><strong>{formatCurrency(trialBalance.totalCredits)}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </>
      )}
    </div>
  );

  return (
    <div className="tab-content">
      <div className="view-mode-selector">
        <button
          className={`view-mode-btn ${viewMode === 'consolidated' ? 'active' : ''}`}
          onClick={() => setViewMode('consolidated')}
        >
          Consolidated
        </button>
        <button
          className={`view-mode-btn ${viewMode === 'accounts' ? 'active' : ''}`}
          onClick={() => setViewMode('accounts')}
        >
          Chart of Accounts
        </button>
        <button
          className={`view-mode-btn ${viewMode === 'entries' ? 'active' : ''}`}
          onClick={() => setViewMode('entries')}
        >
          Journal Entries
        </button>
        <button
          className={`view-mode-btn ${viewMode === 'trial-balance' ? 'active' : ''}`}
          onClick={() => setViewMode('trial-balance')}
        >
          Trial Balance
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Loading general ledger data...</div>
      ) : (
        <>
          {viewMode === 'accounts' && renderAccountsView()}
          {viewMode === 'entries' && renderEntriesView()}
          {viewMode === 'consolidated' && renderConsolidatedView()}
          {viewMode === 'trial-balance' && renderTrialBalanceView()}
        </>
      )}

      <style>{`
        .view-mode-selector {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
          padding: 0.5rem;
          background: #f5f5f5;
          border-radius: 8px;
        }
        .view-mode-btn {
          padding: 0.5rem 1rem;
          border: none;
          background: transparent;
          cursor: pointer;
          border-radius: 4px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .view-mode-btn:hover {
          background: #e0e0e0;
        }
        .view-mode-btn.active {
          background: #1976d2;
          color: white;
        }
        .trial-balance-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .trial-balance-header h3 {
          margin: 0;
        }
        .balance-status {
          padding: 4px 12px;
          border-radius: 16px;
          font-weight: 500;
        }
        .balance-status.balanced {
          background: #e8f5e9;
          color: #2e7d32;
        }
        .balance-status.unbalanced {
          background: #ffebee;
          color: #c62828;
        }
        .consolidated-row {
          background: #fafafa;
        }
        .account-detail-row {
          background: #fff;
          font-size: 0.9em;
        }
        .badge-purple {
          background: #9c27b0 !important;
          color: white;
        }
      `}</style>
    </div>
  );
};

export default GeneralLedgerTab;

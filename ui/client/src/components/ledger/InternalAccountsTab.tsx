import React, { useEffect, useState } from 'react';
import { getInternalAccounts } from '../../api/client';
import { InternalAccount, InternalAccountType, InternalAccountStatus } from '../../types';

const InternalAccountsTab: React.FC = () => {
  const [accounts, setAccounts] = useState<InternalAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [typeFilter, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await getInternalAccounts(
        typeFilter !== 'all' ? typeFilter : undefined,
        statusFilter !== 'all' ? statusFilter : undefined
      );
      setAccounts(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load internal accounts');
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

  const getStatusBadgeClass = (status: InternalAccountStatus) => {
    switch (status) {
      case InternalAccountStatus.ACTIVE: return 'badge badge-success';
      case InternalAccountStatus.INACTIVE: return 'badge badge-warning';
      case InternalAccountStatus.FROZEN: return 'badge badge-error';
      case InternalAccountStatus.CLOSED: return 'badge badge-secondary';
      default: return 'badge';
    }
  };

  const getTypeBadgeClass = (type: InternalAccountType) => {
    switch (type) {
      case InternalAccountType.SUSPENSE: return 'badge badge-warning';
      case InternalAccountType.CLEARING: return 'badge badge-info';
      case InternalAccountType.SETTLEMENT: return 'badge badge-primary';
      case InternalAccountType.PROFIT_LOSS: return 'badge badge-success';
      case InternalAccountType.RESERVE: return 'badge badge-secondary';
      case InternalAccountType.INTERCOMPANY: return 'badge badge-purple';
      default: return 'badge';
    }
  };

  // Calculate totals by type
  const totalsByType = accounts.reduce((acc, account) => {
    if (!acc[account.type]) {
      acc[account.type] = { count: 0, balance: 0 };
    }
    acc[account.type].count++;
    acc[account.type].balance += account.balance;
    return acc;
  }, {} as Record<string, { count: number; balance: number }>);

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="tab-content">
      <div className="ledger-summary">
        <div className="summary-item">
          <span className="label">Total Accounts</span>
          <span className="value">{accounts.length}</span>
        </div>
        <div className="summary-item">
          <span className="label">Total Balance</span>
          <span className="value">{formatCurrency(totalBalance)}</span>
        </div>
        <div className="summary-item">
          <span className="label">Suspense Balance</span>
          <span className="value">{formatCurrency(totalsByType[InternalAccountType.SUSPENSE]?.balance || 0)}</span>
        </div>
        <div className="summary-item">
          <span className="label">Clearing Balance</span>
          <span className="value">{formatCurrency(totalsByType[InternalAccountType.CLEARING]?.balance || 0)}</span>
        </div>
      </div>

      <div className="filters">
        <div className="filter-group">
          <label>Account Type</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            {Object.values(InternalAccountType).map(type => (
              <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            {Object.values(InternalAccountStatus).map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Loading internal accounts...</div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Account Number</th>
                <th>Name</th>
                <th>Type</th>
                <th>GL Code</th>
                <th>Department</th>
                <th>Status</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center">No internal accounts found</td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr key={account.id}>
                    <td className="mono">{account.accountNumber}</td>
                    <td>{account.name}</td>
                    <td><span className={getTypeBadgeClass(account.type)}>{account.type.replace(/_/g, ' ')}</span></td>
                    <td className="mono">{account.glCode}</td>
                    <td>{account.department}</td>
                    <td><span className={getStatusBadgeClass(account.status)}>{account.status}</span></td>
                    <td className={`amount ${account.balance >= 0 ? 'debit' : 'credit'}`}>
                      {formatCurrency(account.balance, account.currency)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default InternalAccountsTab;

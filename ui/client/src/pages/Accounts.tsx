import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAccounts, getProducts, createAccount } from '../api/client';
import { Account, Product, AccountStatus, CreateAccountRequest } from '../types';

const Accounts: React.FC = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newAccount, setNewAccount] = useState<CreateAccountRequest>({
    customerName: '',
    productId: '',
    currency: 'USD',
    initialDeposit: 0
  });

  useEffect(() => {
    loadData();
  }, [statusFilter, searchTerm]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [accountsRes, productsRes] = await Promise.all([
        getAccounts(statusFilter !== 'all' ? statusFilter : undefined, searchTerm || undefined),
        getProducts(true)
      ]);
      setAccounts(accountsRes.data);
      setProducts(productsRes.data);
      setError(null);
    } catch (err) {
      setError('Failed to load accounts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.customerName || !newAccount.productId) return;

    try {
      setCreating(true);
      const created = await createAccount(newAccount);
      setShowCreateModal(false);
      setNewAccount({ customerName: '', productId: '', currency: 'USD', initialDeposit: 0 });
      navigate(`/accounts/${created.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create account');
    } finally {
      setCreating(false);
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
      day: 'numeric'
    });
  };

  const getStatusClass = (status: AccountStatus) => {
    switch (status) {
      case AccountStatus.ACTIVE:
        return 'status-completed';
      case AccountStatus.SUSPENDED:
        return 'status-pending';
      case AccountStatus.CLOSED:
      case AccountStatus.FROZEN:
        return 'status-failed';
      default:
        return '';
    }
  };

  return (
    <div className="page accounts">
      <header className="page-header">
        <div>
          <h1>Accounts</h1>
          <p>Manage customer accounts</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + New Account
        </button>
      </header>

      <div className="filters">
        <div className="filter-group">
          <label>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value={AccountStatus.ACTIVE}>Active</option>
            <option value={AccountStatus.SUSPENDED}>Suspended</option>
            <option value={AccountStatus.FROZEN}>Frozen</option>
            <option value={AccountStatus.CLOSED}>Closed</option>
          </select>
        </div>
        <div className="filter-group search">
          <label>Search</label>
          <input
            type="text"
            placeholder="Search by name or account number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Loading accounts...</div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Account Number</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center">No accounts found</td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr key={account.id}>
                    <td className="mono">{account.accountNumber}</td>
                    <td>{account.customerName}</td>
                    <td>{account.productName}</td>
                    <td className={`amount ${account.balance < 0 ? 'negative' : ''}`}>
                      {formatCurrency(account.balance, account.currency)}
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusClass(account.status)}`}>
                        {account.status}
                      </span>
                    </td>
                    <td>{formatDate(account.createdAt)}</td>
                    <td>
                      <Link to={`/accounts/${account.id}`} className="btn btn-secondary btn-sm">
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Account</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateAccount}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Customer Name *</label>
                  <input
                    type="text"
                    value={newAccount.customerName}
                    onChange={(e) => setNewAccount({ ...newAccount, customerName: e.target.value })}
                    placeholder="Enter customer name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Product *</label>
                  <select
                    value={newAccount.productId}
                    onChange={(e) => setNewAccount({ ...newAccount, productId: e.target.value })}
                    required
                  >
                    <option value="">Select a product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {formatCurrency(product.monthlyFee)}/mo
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Currency</label>
                  <select
                    value={newAccount.currency}
                    onChange={(e) => setNewAccount({ ...newAccount, currency: e.target.value })}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Initial Deposit</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newAccount.initialDeposit}
                    onChange={(e) => setNewAccount({ ...newAccount, initialDeposit: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;

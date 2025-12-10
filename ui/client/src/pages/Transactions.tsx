import React, { useEffect, useState } from 'react';
import { getTransactions, getAccounts, createTransaction } from '../api/client';
import { Transaction, Account, TransactionType, TransactionStatus, CreateTransactionRequest } from '../types';

const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTransaction, setNewTransaction] = useState<CreateTransactionRequest>({
    type: TransactionType.DEPOSIT,
    amount: 0,
    currency: 'USD',
    description: ''
  });

  useEffect(() => {
    loadData();
  }, [typeFilter, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [txnRes, accountsRes] = await Promise.all([
        getTransactions(
          typeFilter !== 'all' ? typeFilter : undefined,
          statusFilter !== 'all' ? statusFilter : undefined
        ),
        getAccounts()
      ]);
      setTransactions(txnRes.data);
      setAccounts(accountsRes.data.filter(a => a.status === 'ACTIVE'));
      setError(null);
    } catch (err) {
      setError('Failed to load transactions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTransaction.amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      await createTransaction(newTransaction);
      setShowCreateModal(false);
      setNewTransaction({
        type: TransactionType.DEPOSIT,
        amount: 0,
        currency: 'USD',
        description: ''
      });
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create transaction');
    } finally {
      setCreating(false);
    }
  };

  const handleTypeChange = (type: TransactionType) => {
    setNewTransaction({
      ...newTransaction,
      type,
      sourceAccountId: undefined,
      destinationAccountId: undefined
    });
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

  const getStatusClass = (status: TransactionStatus) => {
    switch (status) {
      case TransactionStatus.COMPLETED:
        return 'status-completed';
      case TransactionStatus.PENDING:
      case TransactionStatus.PROCESSING:
        return 'status-pending';
      case TransactionStatus.FAILED:
      case TransactionStatus.REVERSED:
        return 'status-failed';
      default:
        return '';
    }
  };

  const needsSourceAccount = [TransactionType.WITHDRAWAL, TransactionType.PAYMENT, TransactionType.TRANSFER].includes(newTransaction.type);
  const needsDestinationAccount = [TransactionType.DEPOSIT, TransactionType.TRANSFER].includes(newTransaction.type);

  return (
    <div className="page transactions">
      <header className="page-header">
        <div>
          <h1>Transactions</h1>
          <p>View and create transactions</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + New Transaction
        </button>
      </header>

      <div className="filters">
        <div className="filter-group">
          <label>Type</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            {Object.values(TransactionType).map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            {Object.values(TransactionStatus).map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Loading transactions...</div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th>Amount</th>
                <th>Description</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center">No transactions found</td>
                </tr>
              ) : (
                transactions.map((txn) => (
                  <tr key={txn.id}>
                    <td>{formatDate(txn.createdAt)}</td>
                    <td><span className="transaction-type">{txn.type}</span></td>
                    <td className="mono">{txn.sourceAccountNumber || '-'}</td>
                    <td className="mono">{txn.destinationAccountNumber || '-'}</td>
                    <td className="amount">{formatCurrency(txn.amount, txn.currency)}</td>
                    <td className="description">{txn.description}</td>
                    <td>
                      <span className={`status-badge ${getStatusClass(txn.status)}`}>
                        {txn.status}
                      </span>
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
              <h2>New Transaction</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateTransaction}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}

                <div className="form-group">
                  <label>Transaction Type *</label>
                  <select
                    value={newTransaction.type}
                    onChange={(e) => handleTypeChange(e.target.value as TransactionType)}
                    required
                  >
                    <option value={TransactionType.DEPOSIT}>Deposit</option>
                    <option value={TransactionType.WITHDRAWAL}>Withdrawal</option>
                    <option value={TransactionType.TRANSFER}>Transfer</option>
                    <option value={TransactionType.PAYMENT}>Payment</option>
                  </select>
                </div>

                {needsSourceAccount && (
                  <div className="form-group">
                    <label>From Account *</label>
                    <select
                      value={newTransaction.sourceAccountId || ''}
                      onChange={(e) => setNewTransaction({ ...newTransaction, sourceAccountId: e.target.value })}
                      required
                    >
                      <option value="">Select source account</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.accountNumber} - {account.customerName} ({formatCurrency(account.balance)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {needsDestinationAccount && (
                  <div className="form-group">
                    <label>To Account *</label>
                    <select
                      value={newTransaction.destinationAccountId || ''}
                      onChange={(e) => setNewTransaction({ ...newTransaction, destinationAccountId: e.target.value })}
                      required
                    >
                      <option value="">Select destination account</option>
                      {accounts
                        .filter(a => a.id !== newTransaction.sourceAccountId)
                        .map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.accountNumber} - {account.customerName}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label>Amount *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={newTransaction.amount || ''}
                    onChange={(e) => setNewTransaction({ ...newTransaction, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Currency</label>
                  <select
                    value={newTransaction.currency}
                    onChange={(e) => setNewTransaction({ ...newTransaction, currency: e.target.value })}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <input
                    type="text"
                    value={newTransaction.description || ''}
                    onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                    placeholder="Enter description"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Processing...' : 'Submit Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;

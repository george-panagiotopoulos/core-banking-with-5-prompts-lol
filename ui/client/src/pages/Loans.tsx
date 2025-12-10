import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLoans } from '../api/client';
import { Loan, LoanType, LoanStatus } from '../types';

const Loans: React.FC = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadLoans();
  }, [typeFilter, statusFilter]);

  const loadLoans = async () => {
    try {
      setLoading(true);
      const typeParam = typeFilter !== 'all' ? typeFilter : undefined;
      const statusParam = statusFilter !== 'all' ? statusFilter : undefined;
      const response = await getLoans(typeParam, statusParam);
      setLoans(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load loans');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPercent = (rate: number) => {
    return (rate * 100).toFixed(2) + '%';
  };

  const getStatusClass = (status: LoanStatus) => {
    switch (status) {
      case LoanStatus.ACTIVE:
        return 'status-active';
      case LoanStatus.PAID_OFF:
        return 'status-completed';
      case LoanStatus.PENDING:
      case LoanStatus.APPROVED:
        return 'status-pending';
      case LoanStatus.DEFAULTED:
        return 'status-failed';
      default:
        return '';
    }
  };

  const getTypeLabel = (type: LoanType) => {
    switch (type) {
      case LoanType.MORTGAGE:
        return 'Mortgage';
      case LoanType.CONSUMER_LOAN:
        return 'Consumer Loan';
      case LoanType.AUTO_LOAN:
        return 'Auto Loan';
      case LoanType.PERSONAL_LOAN:
        return 'Personal Loan';
      default:
        return type;
    }
  };

  const filteredLoans = loans.filter(loan => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      loan.loanNumber.toLowerCase().includes(search) ||
      loan.customerName.toLowerCase().includes(search) ||
      loan.productName.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return <div className="loading">Loading loans...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={loadLoans} className="btn btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div className="page loans">
      <header className="page-header">
        <div>
          <h1>Loans</h1>
          <p>Manage mortgages and consumer loans</p>
        </div>
        <Link to="/loans/new" className="btn btn-primary">
          + New Loan
        </Link>
      </header>

      <div className="filters">
        <div className="filter-group">
          <label>Type</label>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value={LoanType.MORTGAGE}>Mortgage</option>
            <option value={LoanType.CONSUMER_LOAN}>Consumer Loan</option>
            <option value={LoanType.PERSONAL_LOAN}>Personal Loan</option>
            <option value={LoanType.AUTO_LOAN}>Auto Loan</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value={LoanStatus.ACTIVE}>Active</option>
            <option value={LoanStatus.PENDING}>Pending</option>
            <option value={LoanStatus.APPROVED}>Approved</option>
            <option value={LoanStatus.PAID_OFF}>Paid Off</option>
            <option value={LoanStatus.DEFAULTED}>Defaulted</option>
          </select>
        </div>
        <div className="filter-group search">
          <label>Search</label>
          <input
            type="text"
            placeholder="Search by loan #, customer..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>All Loans ({filteredLoans.length})</h2>
        </div>
        <div className="card-content">
          <table className="table">
            <thead>
              <tr>
                <th>Loan #</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Principal</th>
                <th>Outstanding</th>
                <th>Rate</th>
                <th>Monthly</th>
                <th>Status</th>
                <th>Next Payment</th>
              </tr>
            </thead>
            <tbody>
              {filteredLoans.map(loan => (
                <tr key={loan.id}>
                  <td>
                    <Link to={`/loans/${loan.id}`} className="link">
                      {loan.loanNumber}
                    </Link>
                  </td>
                  <td>{loan.customerName}</td>
                  <td>
                    <span className="loan-type">{getTypeLabel(loan.type)}</span>
                  </td>
                  <td className="amount">{formatCurrency(loan.principalAmount)}</td>
                  <td className="amount">{formatCurrency(loan.outstandingBalance)}</td>
                  <td>{formatPercent(loan.interestRate)}</td>
                  <td className="amount">{formatCurrency(loan.monthlyPayment)}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(loan.status)}`}>
                      {loan.status}
                    </span>
                  </td>
                  <td className="date">
                    {loan.status === LoanStatus.ACTIVE ? formatDate(loan.nextPaymentDate) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredLoans.length === 0 && (
            <div className="empty-state">
              <p>No loans found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Loans;

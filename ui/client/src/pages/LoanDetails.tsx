import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getLoan, getLoanPayments, makeLoanPayment } from '../api/client';
import { Loan, LoanPayment, LoanStatus, LoanType } from '../types';

const LoanDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [makingPayment, setMakingPayment] = useState(false);

  useEffect(() => {
    if (id) {
      loadLoanData();
    }
  }, [id]);

  const loadLoanData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const [loanData, paymentsResponse] = await Promise.all([
        getLoan(id),
        getLoanPayments(id)
      ]);
      setLoan(loanData);
      setPayments(paymentsResponse.data);
      setError(null);
    } catch (err) {
      setError('Failed to load loan details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMakePayment = async () => {
    if (!loan || makingPayment) return;

    try {
      setMakingPayment(true);
      await makeLoanPayment(loan.id);
      await loadLoanData();
    } catch (err) {
      console.error('Payment failed:', err);
      alert('Payment failed. Please try again.');
    } finally {
      setMakingPayment(false);
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

  const getStatusClass = (status: LoanStatus | string) => {
    switch (status) {
      case LoanStatus.ACTIVE:
      case 'COMPLETED':
        return 'status-completed';
      case LoanStatus.PAID_OFF:
        return 'status-completed';
      case LoanStatus.PENDING:
      case 'PENDING':
        return 'status-pending';
      case LoanStatus.DEFAULTED:
      case 'FAILED':
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

  if (loading) {
    return <div className="loading">Loading loan details...</div>;
  }

  if (error || !loan) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error || 'Loan not found'}</p>
        <Link to="/loans" className="btn btn-primary">Back to Loans</Link>
      </div>
    );
  }

  const paidPercentage = loan.principalAmount > 0
    ? ((loan.principalAmount - loan.outstandingBalance) / loan.principalAmount) * 100
    : 0;

  return (
    <div className="page loan-details">
      <header className="page-header">
        <div>
          <Link to="/loans" className="back-link">&larr; Back to Loans</Link>
          <h1>{loan.productName}</h1>
          <p className="mono">{loan.loanNumber}</p>
        </div>
        <div className="header-actions">
          <span className={`status-badge large ${getStatusClass(loan.status)}`}>
            {loan.status}
          </span>
          {loan.status === LoanStatus.ACTIVE && (
            <button
              className="btn btn-primary"
              onClick={handleMakePayment}
              disabled={makingPayment}
            >
              {makingPayment ? 'Processing...' : 'Make Payment'}
            </button>
          )}
        </div>
      </header>

      <div className="loan-summary">
        <div className="summary-card balance">
          <span className="label">Outstanding Balance</span>
          <span className="value">
            {formatCurrency(loan.outstandingBalance)}
          </span>
        </div>
        <div className="summary-card">
          <span className="label">Monthly Payment</span>
          <span className="value">{formatCurrency(loan.monthlyPayment)}</span>
        </div>
        <div className="summary-card">
          <span className="label">Interest Rate</span>
          <span className="value">{formatPercent(loan.interestRate)}</span>
        </div>
        <div className="summary-card">
          <span className="label">Next Payment</span>
          <span className="value small">
            {loan.status === LoanStatus.ACTIVE ? formatDate(loan.nextPaymentDate) : 'N/A'}
          </span>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Loan Overview</h2>
        </div>
        <div className="card-content">
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Loan Type</span>
              <span className="value">{getTypeLabel(loan.type)}</span>
            </div>
            <div className="info-item">
              <span className="label">Principal Amount</span>
              <span className="value">{formatCurrency(loan.principalAmount)}</span>
            </div>
            <div className="info-item">
              <span className="label">Term</span>
              <span className="value">{loan.termMonths} months</span>
            </div>
            <div className="info-item">
              <span className="label">Total Paid</span>
              <span className="value">{formatCurrency(loan.totalPaid)}</span>
            </div>
            <div className="info-item">
              <span className="label">Customer</span>
              <span className="value">{loan.customerName}</span>
            </div>
            <div className="info-item">
              <span className="label">Linked Account</span>
              <span className="value">
                <Link to={`/accounts/${loan.accountId}`} className="link">
                  {loan.accountNumber}
                </Link>
              </span>
            </div>
            <div className="info-item">
              <span className="label">Start Date</span>
              <span className="value">{formatDate(loan.startDate)}</span>
            </div>
            <div className="info-item">
              <span className="label">End Date</span>
              <span className="value">{formatDate(loan.endDate)}</span>
            </div>
          </div>

          <div className="progress-section">
            <div className="progress-header">
              <span className="label">Repayment Progress</span>
              <span className="value">{paidPercentage.toFixed(1)}%</span>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${paidPercentage}%` }}
                ></div>
              </div>
            </div>
            <div className="progress-footer">
              <span className="label">{formatCurrency(loan.principalAmount - loan.outstandingBalance)} paid</span>
              <span className="label">{formatCurrency(loan.outstandingBalance)} remaining</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Payment History ({payments.length})</h2>
        </div>
        {payments.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Principal</th>
                <th>Interest</th>
                <th>Balance After</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(payment => (
                <tr key={payment.id}>
                  <td>{formatDate(payment.paymentDate)}</td>
                  <td className="amount">{formatCurrency(payment.amount)}</td>
                  <td className="amount">{formatCurrency(payment.principal)}</td>
                  <td className="amount">{formatCurrency(payment.interest)}</td>
                  <td className="amount">{formatCurrency(payment.balance)}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(payment.status)}`}>
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <p>No payments recorded yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoanDetails;

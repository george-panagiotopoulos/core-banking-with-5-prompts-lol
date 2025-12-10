import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { getDashboardSummary } from '../api/client';
import { DashboardSummary, TransactionStatus } from '../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await getDashboardSummary();
      setSummary(data);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard data. Make sure the API server is running.');
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
        return 'status-pending';
      case TransactionStatus.FAILED:
        return 'status-failed';
      default:
        return '';
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Connection Error</h2>
        <p>{error}</p>
        <button onClick={loadDashboard} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  if (!summary) return null;

  const chartData = {
    labels: Object.keys(summary.volumeByType),
    datasets: [
      {
        label: 'Transaction Count',
        data: Object.values(summary.volumeByType).map(v => v.count),
        backgroundColor: 'rgba(26, 35, 126, 0.8)',
        borderRadius: 4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Transaction Volume by Type'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  return (
    <div className="page dashboard">
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of your banking system</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon accounts">&#9733;</div>
          <div className="stat-content">
            <span className="stat-value">{summary.accounts.total}</span>
            <span className="stat-label">Total Accounts</span>
            <span className="stat-detail">{summary.accounts.active} active</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon balance">$</div>
          <div className="stat-content">
            <span className="stat-value">{formatCurrency(summary.balances.totalBalance)}</span>
            <span className="stat-label">Total Balance</span>
            <span className="stat-detail">Avg: {formatCurrency(summary.balances.averageBalance)}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon transactions">&#8644;</div>
          <div className="stat-content">
            <span className="stat-value">{summary.transactions.total}</span>
            <span className="stat-label">Total Transactions</span>
            <span className="stat-detail">{summary.transactions.pending} pending</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon success">&#10003;</div>
          <div className="stat-content">
            <span className="stat-value">{summary.transactions.completed}</span>
            <span className="stat-label">Completed</span>
            <span className="stat-detail">{summary.transactions.failed} failed</span>
          </div>
        </div>

        {summary.loans && (
          <>
            <div className="stat-card">
              <div className="stat-icon loans">&#9830;</div>
              <div className="stat-content">
                <span className="stat-value">{summary.loans.total}</span>
                <span className="stat-label">Total Loans</span>
                <span className="stat-detail">{summary.loans.active} active</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon outstanding">&#36;</div>
              <div className="stat-content">
                <span className="stat-value">{formatCurrency(summary.loans.totalOutstanding)}</span>
                <span className="stat-label">Outstanding Balance</span>
                <span className="stat-detail">
                  {summary.loans.mortgages} mortgages, {summary.loans.consumerLoans} consumer
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="dashboard-grid">
        <div className="card chart-card">
          <div className="card-header">
            <h2>Transaction Volume</h2>
          </div>
          <div className="card-content chart-container">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Recent Transactions</h2>
            <Link to="/transactions" className="btn btn-secondary btn-sm">
              View All
            </Link>
          </div>
          <div className="card-content">
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentTransactions.map((txn) => (
                  <tr key={txn.id}>
                    <td>
                      <span className="transaction-type">{txn.type}</span>
                    </td>
                    <td className="amount">
                      {formatCurrency(txn.amount, txn.currency)}
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusClass(txn.status)}`}>
                        {txn.status}
                      </span>
                    </td>
                    <td className="date">{formatDate(txn.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {summary.loans && summary.loans.total > 0 && (
          <div className="card">
            <div className="card-header">
              <h2>Loan Overview</h2>
              <Link to="/loans" className="btn btn-secondary btn-sm">
                View Loans
              </Link>
            </div>
            <div className="card-content">
              <div className="loan-summary">
                <div className="summary-item">
                  <span className="summary-label">Active Loans:</span>
                  <span className="summary-value">{summary.loans.active}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Mortgages:</span>
                  <span className="summary-value">{summary.loans.mortgages}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Consumer Loans:</span>
                  <span className="summary-value">{summary.loans.consumerLoans}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Total Outstanding:</span>
                  <span className="summary-value">{formatCurrency(summary.loans.totalOutstanding)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

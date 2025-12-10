import React, { useEffect, useState } from 'react';
import { getSuspenseEntries, getSuspenseSummary } from '../../api/client';
import { SuspenseEntry, SuspenseReason } from '../../types';

const SuspenseAccountsTab: React.FC = () => {
  const [entries, setEntries] = useState<SuspenseEntry[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [statusFilter, priorityFilter, reasonFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [entriesRes, summaryRes] = await Promise.all([
        getSuspenseEntries(
          statusFilter !== 'all' ? statusFilter : undefined,
          priorityFilter !== 'all' ? priorityFilter : undefined,
          reasonFilter !== 'all' ? reasonFilter : undefined
        ),
        getSuspenseSummary()
      ]);
      setEntries(entriesRes.data);
      setSummary(summaryRes);
      setError(null);
    } catch (err) {
      setError('Failed to load suspense entries');
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN': return 'badge badge-warning';
      case 'RESOLVED': return 'badge badge-success';
      case 'ESCALATED': return 'badge badge-error';
      case 'WRITTEN_OFF': return 'badge badge-secondary';
      default: return 'badge';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'badge badge-error';
      case 'HIGH': return 'badge badge-warning';
      case 'MEDIUM': return 'badge badge-info';
      case 'LOW': return 'badge badge-secondary';
      default: return 'badge';
    }
  };

  const getReasonLabel = (reason: string) => {
    return reason.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const getAgeColor = (days: number) => {
    if (days > 30) return 'age-critical';
    if (days > 14) return 'age-warning';
    return '';
  };

  return (
    <div className="tab-content">
      {summary && (
        <div className="ledger-summary">
          <div className="summary-item">
            <span className="label">Total Entries</span>
            <span className="value">{summary.totalEntries}</span>
          </div>
          <div className="summary-item balance">
            <span className="label">Open Entries</span>
            <span className="value">{summary.openEntries}</span>
          </div>
          <div className="summary-item credit">
            <span className="label">Open Amount</span>
            <span className="value">{formatCurrency(summary.totalOpenAmount)}</span>
          </div>
          <div className="summary-item">
            <span className="label">Avg Age (Days)</span>
            <span className="value">{summary.avgAgeInDays}</span>
          </div>
        </div>
      )}

      {summary && (
        <div className="ledger-summary" style={{ marginTop: '0.5rem' }}>
          <div className="summary-item">
            <span className="label">Resolved</span>
            <span className="value badge badge-success">{summary.resolvedEntries}</span>
          </div>
          <div className="summary-item">
            <span className="label">Escalated</span>
            <span className="value badge badge-error">{summary.escalatedEntries}</span>
          </div>
          <div className="summary-item">
            <span className="label">Critical Priority</span>
            <span className="value badge badge-error">{summary.criticalCount}</span>
          </div>
          <div className="summary-item">
            <span className="label">High Priority</span>
            <span className="value badge badge-warning">{summary.highPriorityCount}</span>
          </div>
        </div>
      )}

      <div className="filters">
        <div className="filter-group">
          <label>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="RESOLVED">Resolved</option>
            <option value="ESCALATED">Escalated</option>
            <option value="WRITTEN_OFF">Written Off</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Priority</label>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="all">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Reason</label>
          <select value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)}>
            <option value="all">All Reasons</option>
            {Object.values(SuspenseReason).map(reason => (
              <option key={reason} value={reason}>{getReasonLabel(reason)}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Loading suspense entries...</div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Created</th>
                <th>Age</th>
                <th>Reason</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Original Txn</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center">No suspense entries found</td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="mono">{entry.id}</td>
                    <td>{formatDate(entry.createdAt)}</td>
                    <td className={getAgeColor(entry.ageInDays)}>
                      <strong>{entry.ageInDays}</strong> days
                    </td>
                    <td>{getReasonLabel(entry.reason)}</td>
                    <td><span className={getPriorityBadge(entry.priority)}>{entry.priority}</span></td>
                    <td><span className={getStatusBadge(entry.status)}>{entry.status}</span></td>
                    <td>{entry.assignedTo}</td>
                    <td className="mono">{entry.originalTransactionId}</td>
                    <td className="amount">{formatCurrency(entry.amount, entry.currency)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {summary && summary.byReason && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3>Entries by Reason</h3>
          <div className="reason-breakdown">
            {Object.entries(summary.byReason).map(([reason, count]) => (
              <div key={reason} className="reason-item">
                <span className="reason-label">{getReasonLabel(reason)}</span>
                <span className="reason-count">{count as number}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .age-warning { color: #ff9800; font-weight: bold; }
        .age-critical { color: #f44336; font-weight: bold; }
        .reason-breakdown {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 0.5rem;
          padding: 1rem;
        }
        .reason-item {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem;
          background: #f5f5f5;
          border-radius: 4px;
        }
        .reason-label { font-size: 0.9em; }
        .reason-count {
          font-weight: bold;
          background: #e0e0e0;
          padding: 2px 8px;
          border-radius: 12px;
        }
      `}</style>
    </div>
  );
};

export default SuspenseAccountsTab;

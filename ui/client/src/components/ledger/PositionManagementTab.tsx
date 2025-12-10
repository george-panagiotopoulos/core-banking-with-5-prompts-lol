import React, { useEffect, useState } from 'react';
import { getPositions, getPositionsSummary, getPositionLimits, getPositionMovements } from '../../api/client';
import { CurrencyPosition, PositionLimit, PositionMovement } from '../../types';

const PositionManagementTab: React.FC = () => {
  const [positions, setPositions] = useState<CurrencyPosition[]>([]);
  const [limits, setLimits] = useState<PositionLimit[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [movements, setMovements] = useState<PositionMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [positionsRes, limitsRes, summaryRes] = await Promise.all([
        getPositions(),
        getPositionLimits(),
        getPositionsSummary()
      ]);
      setPositions(positionsRes.data);
      setLimits(limitsRes.data);
      setSummary(summaryRes);
      setError(null);
    } catch (err) {
      setError('Failed to load positions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMovements = async (currency: string) => {
    try {
      const response = await getPositionMovements(currency);
      setMovements(response.data);
      setSelectedCurrency(currency);
    } catch (err) {
      console.error('Failed to load movements', err);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getLimitStatusBadge = (status: string) => {
    switch (status) {
      case 'WITHIN_LIMIT': return 'badge badge-success';
      case 'WARNING': return 'badge badge-warning';
      case 'BREACH': return 'badge badge-error';
      default: return 'badge';
    }
  };

  const getMovementTypeBadge = (type: string) => {
    switch (type) {
      case 'BUY': return 'badge badge-success';
      case 'SELL': return 'badge badge-error';
      case 'FX_SPOT': return 'badge badge-info';
      case 'FX_FORWARD': return 'badge badge-primary';
      case 'SETTLEMENT': return 'badge badge-secondary';
      default: return 'badge';
    }
  };

  const getMovementStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN': return 'badge badge-warning';
      case 'SETTLED': return 'badge badge-success';
      case 'CANCELLED': return 'badge badge-secondary';
      default: return 'badge';
    }
  };

  return (
    <div className="tab-content">
      {summary && (
        <div className="ledger-summary">
          <div className="summary-item">
            <span className="label">Total Positions</span>
            <span className="value">{summary.totalPositions}</span>
          </div>
          <div className="summary-item debit">
            <span className="label">Unrealized P&L</span>
            <span className={`value ${summary.totalUnrealizedPnL >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(summary.totalUnrealizedPnL)}
            </span>
          </div>
          <div className="summary-item credit">
            <span className="label">Realized P&L</span>
            <span className="value">{formatCurrency(summary.totalRealizedPnL)}</span>
          </div>
          <div className="summary-item">
            <span className="label">Limit Status</span>
            <span className="value">
              <span className="badge badge-success">{summary.withinLimit}</span>
              <span className="badge badge-warning" style={{marginLeft: 4}}>{summary.warnings}</span>
              <span className="badge badge-error" style={{marginLeft: 4}}>{summary.breaches}</span>
            </span>
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Loading positions...</div>
      ) : (
        <>
          <div className="card">
            <h3>Currency Positions</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Currency</th>
                  <th>Long Position</th>
                  <th>Short Position</th>
                  <th>Net Position</th>
                  <th>Avg Rate</th>
                  <th>Market Rate</th>
                  <th>Unrealized P&L</th>
                  <th>Realized P&L</th>
                  <th>Utilization</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((pos) => {
                  const limit = limits.find(l => l.currency === pos.currency);
                  return (
                    <tr key={pos.id} className={selectedCurrency === pos.currency ? 'selected' : ''}>
                      <td><strong>{pos.currency}/USD</strong></td>
                      <td className="amount">{formatNumber(pos.longPosition)}</td>
                      <td className="amount">{formatNumber(pos.shortPosition)}</td>
                      <td className={`amount ${pos.netPosition >= 0 ? 'debit' : 'credit'}`}>
                        {formatNumber(pos.netPosition)}
                      </td>
                      <td>{pos.averageRate.toFixed(4)}</td>
                      <td>{pos.marketRate.toFixed(4)}</td>
                      <td className={`amount ${pos.unrealizedPnL >= 0 ? 'debit' : 'credit'}`}>
                        {formatCurrency(pos.unrealizedPnL)}
                      </td>
                      <td className="amount debit">{formatCurrency(pos.realizedPnL)}</td>
                      <td>
                        <div className="progress-bar">
                          <div
                            className={`progress-fill ${pos.utilizationPercent > 80 ? 'danger' : pos.utilizationPercent > 60 ? 'warning' : ''}`}
                            style={{ width: `${Math.min(pos.utilizationPercent, 100)}%` }}
                          />
                        </div>
                        <span className="progress-text">{pos.utilizationPercent.toFixed(1)}%</span>
                        {limit && <span className={getLimitStatusBadge(limit.status)} style={{marginLeft: 4}}>{limit.status.replace(/_/g, ' ')}</span>}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => loadMovements(pos.currency)}
                        >
                          Movements
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="card" style={{ marginTop: '1rem' }}>
            <h3>Position Limits</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Currency</th>
                  <th>Daylight Limit</th>
                  <th>Overnight Limit</th>
                  <th>Stop Loss</th>
                  <th>Current Utilization</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {limits.map((limit) => (
                  <tr key={limit.id}>
                    <td><strong>{limit.currency}</strong></td>
                    <td className="amount">{formatNumber(limit.daylight)}</td>
                    <td className="amount">{formatNumber(limit.overnight)}</td>
                    <td className="amount">{formatNumber(limit.stopLoss)}</td>
                    <td className="amount">{formatNumber(limit.currentUtilization)}</td>
                    <td><span className={getLimitStatusBadge(limit.status)}>{limit.status.replace(/_/g, ' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedCurrency && (
            <div className="card" style={{ marginTop: '1rem' }}>
              <h3>Position Movements - {selectedCurrency}/USD</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Value Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Rate</th>
                    <th>Counter Amount</th>
                    <th>Trader</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.slice(0, 15).map((mov) => (
                    <tr key={mov.id}>
                      <td>{formatDate(mov.valueDate)}</td>
                      <td><span className={getMovementTypeBadge(mov.movementType)}>{mov.movementType}</span></td>
                      <td className="amount">{formatNumber(mov.amount)} {mov.currency}</td>
                      <td>{mov.rate.toFixed(4)}</td>
                      <td className="amount">{formatCurrency(mov.counterAmount)}</td>
                      <td>{mov.traderName}</td>
                      <td><span className={getMovementStatusBadge(mov.status)}>{mov.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <style>{`
        .progress-bar {
          width: 60px;
          height: 8px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
          display: inline-block;
          vertical-align: middle;
        }
        .progress-fill {
          height: 100%;
          background: #4caf50;
          transition: width 0.3s;
        }
        .progress-fill.warning {
          background: #ff9800;
        }
        .progress-fill.danger {
          background: #f44336;
        }
        .progress-text {
          margin-left: 8px;
          font-size: 0.85em;
        }
        .positive { color: #4caf50; }
        .negative { color: #f44336; }
      `}</style>
    </div>
  );
};

export default PositionManagementTab;

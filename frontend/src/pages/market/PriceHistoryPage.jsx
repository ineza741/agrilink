import { useState, useEffect } from 'react';
import { phase1BackendService } from '../../services/phase1Backend';
import {
  History,
  Filter,
  Download,
  FileText,
  FileSpreadsheet,
  LoaderCircle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { toast } from 'sonner';

export function PriceHistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCrop, setFilterCrop] = useState('');
  const [filterMarket, setFilterMarket] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    setLoading(true);
    try {
      const data = await phase1BackendService.cropPrices.history();
      setHistory(data);
    } catch (err) {
      toast.error('Failed to fetch price history');
    } finally {
      setLoading(false);
    }
  }

  const crops = [...new Set(history.map((h) => h.cropName))];
  const markets = [...new Set(history.map((h) => h.marketName))];
  const districts = [...new Set(history.map((h) => h.district))];

  const filtered = history.filter((h) => {
    if (filterCrop && h.cropName !== filterCrop) return false;
    if (filterMarket && h.marketName !== filterMarket) return false;
    if (filterDistrict && h.district !== filterDistrict) return false;
    return true;
  });

  function clearFilters() {
    setFilterCrop('');
    setFilterMarket('');
    setFilterDistrict('');
  }

  async function exportPdf() {
    try {
      const blob = await phase1BackendService.cropPrices.exportHistoryPdf({
        cropName: filterCrop || undefined,
        marketName: filterMarket || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'price-history.pdf';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF exported successfully');
    } catch (err) {
      toast.error('Failed to export PDF');
    }
  }

  async function exportExcel() {
    try {
      const blob = await phase1BackendService.cropPrices.exportHistoryExcel({
        cropName: filterCrop || undefined,
        marketName: filterMarket || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'price-history.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Excel exported successfully');
    } catch (err) {
      toast.error('Failed to export Excel');
    }
  }

  function formatPrice(value) {
    return `RWF ${Number(value).toLocaleString()}`;
  }

  function renderChange(oldVal, newVal) {
    const diff = newVal - oldVal;
    const pct = oldVal > 0 ? ((diff / oldVal) * 100).toFixed(1) : '0.0';
    const isUp = diff > 0;
    const isDown = diff < 0;

    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {isUp && <ArrowUpRight size={14} color="#16a34a" />}
        {isDown && <ArrowDownRight size={14} color="#dc2626" />}
        <span
          style={{
            color: isUp ? '#16a34a' : isDown ? '#dc2626' : '#6b7280',
            fontWeight: 600,
          }}
        >
          {isUp ? '+' : ''}
          {formatPrice(diff)} ({pct}%)
        </span>
      </span>
    );
  }

  return (
    <div className="prototype-panel">
      <div className="ai-center-panel-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <History size={20} />
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Price History</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
              Track all crop price changes across the system
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="recommendation-secondary-button" onClick={fetchHistory}>
            <RefreshCw size={14} />
            Refresh
          </button>
          <button className="recommendation-secondary-button" onClick={exportPdf}>
            <FileText size={14} />
            PDF Export
          </button>
          <button className="recommendation-secondary-button" onClick={exportExcel}>
            <FileSpreadsheet size={14} />
            Excel Export
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
          alignItems: 'center',
        }}
      >
        <Filter size={16} color="#6b7280" />
        <select
          value={filterCrop}
          onChange={(e) => setFilterCrop(e.target.value)}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            fontSize: 13,
          }}
        >
          <option value="">All Crops</option>
          {crops.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={filterMarket}
          onChange={(e) => setFilterMarket(e.target.value)}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            fontSize: 13,
          }}
        >
          <option value="">All Markets</option>
          {markets.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={filterDistrict}
          onChange={(e) => setFilterDistrict(e.target.value)}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            fontSize: 13,
          }}
        >
          <option value="">All Districts</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        {(filterCrop || filterMarket || filterDistrict) && (
          <button
            className="recommendation-secondary-button"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        )}
      </div>

      <div style={{ padding: '16px 24px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <LoaderCircle size={24} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="recommendation-card"
            style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}
          >
            <History size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ fontSize: 15, fontWeight: 500 }}>No price history found</p>
            <p style={{ fontSize: 13 }}>
              {history.length === 0
                ? 'No price changes have been recorded yet.'
                : 'No records match your current filters.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  {['Crop', 'Market', 'District', 'Old Wholesale', 'New Wholesale', 'Change', 'Old Retail', 'New Retail', 'Changed By', 'Reason', 'Date'].map(
                    (col) => (
                      <th
                        key={col}
                        style={{
                          textAlign: 'left',
                          padding: '10px 12px',
                          fontWeight: 600,
                          color: '#6b7280',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{ borderBottom: '1px solid #f3f4f6' }}
                  >
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>
                      {row.cropName}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{row.marketName}</td>
                    <td style={{ padding: '10px 12px' }}>{row.district}</td>
                    <td style={{ padding: '10px 12px' }}>
                      {formatPrice(row.oldWholesale)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {formatPrice(row.newWholesale)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {renderChange(row.oldWholesale, row.newWholesale)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {formatPrice(row.oldRetail)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {formatPrice(row.newRetail)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{row.changedBy}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className="recommendation-status-chip">
                        {row.reason || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      {row.date
                        ? new Date(row.date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

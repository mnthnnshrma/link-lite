import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const COLORS = ['#4CAF50', '#FF9800', '#2c82c9', '#e74c3c', '#9C27B0'];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null;

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const renderLegendText = (value) => {
  return <span style={{ color: 'var(--text)', marginLeft: '4px' }}>{value}</span>;
};

function Stats() {
  const { shortCode } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get(`/api/urls/${shortCode}/stats`);
        setStats(res.data);
      } catch (err) {
        setError('Failed to load stats.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [api, shortCode]);

  return (
    <div className="card" style={{ maxWidth: '900px', margin: '40px auto' }}>
      <div className="modal-header">
        <h2>Analytics for /{shortCode}</h2>
        <button className="navbar-btn" onClick={() => navigate('/my-links')}>Back to Links</button>
      </div>

      {loading ? (
        <p className="loading-text">Loading analytics...</p>
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : stats ? (
        <div className="stats-container">
          <div className="stats-kpi-row">
            <div className="kpi-card">
              <h3>Total Human Clicks</h3>
              <p className="kpi-value">{stats.totalHumanClicks}</p>
            </div>
            <div className="kpi-card">
              <h3>Total Bot Clicks</h3>
              <p className="kpi-value">{stats.totalBotClicks}</p>
            </div>
            <div className="kpi-card">
              <h3>Total Clicks</h3>
              <p className="kpi-value">{stats.totalRawClicks}</p>
            </div>
          </div>

          <div className="chart-section">
            <h3>Clicks Over Time (Human)</h3>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={stats.clicksOverTime}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                  <XAxis dataKey="date" stroke="var(--text-light)" />
                  <YAxis stroke="var(--text-light)" allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }} itemStyle={{ color: 'var(--text-heading)' }} />
                  <Area type="monotone" dataKey="count" stroke="var(--accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" dot={{ r: 4, fill: 'var(--surface)', stroke: 'var(--accent)', strokeWidth: 2 }} activeDot={{ r: 6, fill: 'var(--accent)', stroke: 'var(--surface)', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="stats-breakdowns">
            <div className="breakdown-col">
              <h3>Device Types</h3>
              <div className="chart-wrapper-small" style={{ padding: '16px' }}>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                      data={stats.deviceTypeStats.map(d => ({ ...d, name: d.name.charAt(0).toUpperCase() + d.name.slice(1) }))}
                      outerRadius={65}
                      dataKey="count"
                      nameKey="name"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      stroke="none"
                    >
                      {stats.deviceTypeStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', borderColor: '#333', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                    <Legend formatter={renderLegendText} layout="vertical" verticalAlign="middle" align="right" iconType="circle" wrapperStyle={{ fontSize: '13px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="breakdown-col">
              <h3>Operating Systems</h3>
              <div className="chart-wrapper-small" style={{ padding: '16px' }}>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                      data={stats.osStats.map(d => ({ ...d, name: d.name.charAt(0).toUpperCase() + d.name.slice(1) }))}
                      outerRadius={65}
                      dataKey="count"
                      nameKey="name"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      stroke="none"
                    >
                      {stats.osStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', borderColor: '#333', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                    <Legend formatter={renderLegendText} layout="vertical" verticalAlign="middle" align="right" iconType="circle" wrapperStyle={{ fontSize: '13px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {((stats.referrerStats && stats.referrerStats.length > 0) || (stats.countryStats && stats.countryStats.length > 0)) && (
            <div className="stats-breakdowns" style={{ marginTop: '32px' }}>
              {stats.referrerStats && stats.referrerStats.length > 0 && (
                <div className="breakdown-col">
                  <h3>Top Referrers</h3>
                  <ul className="referrer-list">
                    {stats.referrerStats.map((ref, idx) => (
                      <li key={idx}>
                        <span className="ref-name">{ref.name}</span>
                        <span className="ref-count">{ref.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {stats.countryStats && stats.countryStats.length > 0 && (
                <div className="breakdown-col">
                  <h3>Top Countries</h3>
                  <div className="chart-wrapper-small">
                    <ResponsiveContainer width="100%" height={Math.max(150, stats.countryStats.length * 40)}>
                      <BarChart data={stats.countryStats} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" stroke="#888" width={80} fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', borderColor: '#333' }} cursor={{ fill: 'transparent' }} />
                        <Bar dataKey="count" fill="#9C27B0" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default Stats;

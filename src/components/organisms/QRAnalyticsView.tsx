import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, limit, getDocs, Timestamp, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/useAuthStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';
import { Loader2, QrCode, Calendar, Link as LinkIcon } from 'lucide-react';

interface ScanLog {
  id: string;
  url: string;
  tileId: string;
  screenId?: string;
  timestamp: Timestamp;
  userAgent: string;
}

export const QRAnalyticsView = () => {
  const { organization } = useAuthStore();
  const [scans, setScans] = useState<ScanLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScans = async () => {
      if (!organization?.id) return;
      
      try {
        // Fetch last 500 scans for this org
        const q = query(
          collection(db, 'qr_scans'), 
          where('orgId', '==', organization.id),
          orderBy('timestamp', 'desc'), 
          limit(500)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ScanLog[];
        setScans(data);
      } catch (err) {
        console.error("Failed to fetch scans", err);
      } finally {
        setLoading(false);
      }
    };

    fetchScans();
  }, [organization?.id]);

  const stats = useMemo(() => {
    const totalScans = scans.length;
    
    // Group by URL
    const byUrl = scans.reduce((acc, scan) => {
      const url = scan.url || 'Unknown';
      acc[url] = (acc[url] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topUrls = Object.entries(byUrl)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Group by Date (last 7 days)
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toLocaleDateString();
    }).reverse();

    const byDate = last7Days.map(date => {
      const count = scans.filter(s => s.timestamp?.toDate().toLocaleDateString() === date).length;
      return { date, count };
    });

    return { totalScans, topUrls, byDate };
  }, [scans]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-text mb-2">QR Code Analytics</h1>
        <p className="text-text-muted">Track performance of your interactive QR tiles.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface border border-surface-highlight rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-primary/10 text-primary rounded-lg">
              <QrCode size={24} />
            </div>
            <div>
              <div className="text-sm text-text-muted font-bold uppercase tracking-wider">Total Scans</div>
              <div className="text-3xl font-black text-text">{stats.totalScans}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-surface border border-surface-highlight rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
              <Calendar size={24} />
            </div>
            <div>
              <div className="text-sm text-text-muted font-bold uppercase tracking-wider">Last 7 Days</div>
              <div className="text-3xl font-black text-text">
                {stats.byDate.reduce((acc, curr) => acc + curr.count, 0)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-surface-highlight rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-green-500/10 text-green-500 rounded-lg">
              <LinkIcon size={24} />
            </div>
            <div>
              <div className="text-sm text-text-muted font-bold uppercase tracking-wider">Active Links</div>
              <div className="text-3xl font-black text-text">{stats.topUrls.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface border border-surface-highlight rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-text mb-6">Scan Activity</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.byDate}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="date" stroke="#666" fontSize={12} tickLine={false} />
                <YAxis stroke="#666" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="count" stroke="#EA580C" strokeWidth={3} dot={{ r: 4, fill: '#EA580C' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface border border-surface-highlight rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-text mb-6">Top Destinations</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topUrls} layout="vertical" margin={{ left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} horizontal={false} />
                <XAxis type="number" stroke="#666" fontSize={12} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={100} hide />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                />
                <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {stats.topUrls.map((url, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="truncate max-w-[200px] text-text-muted" title={url.name}>{url.name}</div>
                  <div className="font-bold text-text">{url.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-surface border border-surface-highlight rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-surface-highlight">
          <h3 className="text-lg font-bold text-text">Recent Scans</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface-highlight/20 text-text-muted font-bold uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Destination</th>
                <th className="px-6 py-3">Device / User Agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-highlight">
              {scans.slice(0, 10).map((scan) => (
                <tr key={scan.id} className="hover:bg-surface-highlight/10 transition-colors">
                  <td className="px-6 py-3 text-text-muted">
                    {scan.timestamp?.toDate().toLocaleString()}
                  </td>
                  <td className="px-6 py-3 font-medium text-primary truncate max-w-xs" title={scan.url}>
                    {scan.url}
                  </td>
                  <td className="px-6 py-3 text-text-muted truncate max-w-xs" title={scan.userAgent}>
                    {scan.userAgent}
                  </td>
                </tr>
              ))}
              {scans.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-text-muted">
                    No scans recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

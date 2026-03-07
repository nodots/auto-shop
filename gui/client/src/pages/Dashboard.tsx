import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchDashboard } from '../api';
import StatusBadge from '../components/StatusBadge';

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
  });

  if (isLoading) return <p className="text-gray-500">Loading dashboard...</p>;
  if (error) return <p className="text-red-600">Error: {(error as Error).message}</p>;
  if (!data) return null;

  const capacityPct = (data.capacity.active / data.capacity.max) * 100;
  const capacityColor =
    data.capacity.active >= data.capacity.max
      ? 'bg-red-500'
      : data.capacity.active >= 3
      ? 'bg-yellow-500'
      : 'bg-green-500';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      {/* Capacity gauge */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Active Cell Capacity</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-gray-200 rounded-full h-4">
            <div
              className={`${capacityColor} h-4 rounded-full transition-all`}
              style={{ width: `${Math.min(capacityPct, 100)}%` }}
            />
          </div>
          <span className="text-lg font-bold">
            {data.capacity.active}/{data.capacity.max}
          </span>
        </div>
      </div>

      {/* Status counts */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(data.counts).map(([status, count]) => (
          <Link
            key={status}
            to={`/cells?status=${status}`}
            className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
          >
            <div className="text-2xl font-bold">{count}</div>
            <StatusBadge status={status} />
          </Link>
        ))}
      </div>

      {/* Blocked cells alert */}
      {data.blockedCells.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-medium text-red-800 mb-2">
            Blocked Cells ({data.blockedCells.length})
          </h3>
          <ul className="space-y-2">
            {data.blockedCells.map((cell) => (
              <li key={cell.id} className="flex items-center justify-between">
                <Link to={`/cells/${cell.id}`} className="text-red-700 hover:underline font-medium">
                  {cell.feature}
                </Link>
                <span className="text-sm text-red-600">{cell.project}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ready PRs */}
      {data.readyPRs.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-800 mb-2">
            Ready for Review ({data.readyPRs.length})
          </h3>
          <ul className="space-y-2">
            {data.readyPRs.map((cell) => (
              <li key={cell.id} className="flex items-center justify-between">
                <Link to={`/cells/${cell.id}`} className="text-yellow-700 hover:underline font-medium">
                  {cell.feature}
                </Link>
                {cell.github_pr_url && (
                  <a
                    href={cell.github_pr_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    PR
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recent activity */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-medium text-gray-700 mb-3">Recent Activity</h3>
        {data.recentActivity.length === 0 ? (
          <p className="text-gray-400 text-sm">No recent activity</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.recentActivity.map((entry) => (
              <li key={entry.id} className="flex items-center gap-2">
                <span className="text-gray-400 w-36 shrink-0">
                  {new Date(entry.changed_at).toLocaleString()}
                </span>
                <span className="font-medium">{entry.feature}</span>
                {entry.from_status && <StatusBadge status={entry.from_status} />}
                <span className="text-gray-400">&rarr;</span>
                <StatusBadge status={entry.to_status} />
                {entry.note && <span className="text-gray-500 truncate">{entry.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

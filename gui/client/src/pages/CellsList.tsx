import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchCells } from '../api';
import StatusBadge from '../components/StatusBadge';

const statuses = ['all', 'queued', 'active', 'blocked', 'awaiting-review', 'merged'];

export default function CellsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || 'all';

  const { data: cells, isLoading, error } = useQuery({
    queryKey: ['cells', statusFilter],
    queryFn: () => fetchCells(statusFilter === 'all' ? undefined : { status: statusFilter }),
  });

  if (isLoading) return <p className="text-gray-500">Loading cells...</p>;
  if (error) return <p className="text-red-600">Error: {(error as Error).message}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Cells</h2>
        <Link
          to="/cells/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          New Cell
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setSearchParams(s === 'all' ? {} : { status: s })}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Cells table */}
      {!cells || cells.length === 0 ? (
        <p className="text-gray-400 py-8 text-center">No cells found</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500">Feature</th>
                <th className="px-4 py-3 font-medium text-gray-500">Project</th>
                <th className="px-4 py-3 font-medium text-gray-500">Branch</th>
                <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 font-medium text-gray-500">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cells.map((cell) => (
                <tr key={cell.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/cells/${cell.id}`} className="text-blue-600 hover:underline font-medium">
                      {cell.feature}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{cell.project}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{cell.branch}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={cell.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(cell.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

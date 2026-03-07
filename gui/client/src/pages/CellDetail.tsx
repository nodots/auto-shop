import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { fetchCell, updateCellStatus, deleteCell } from '../api';
import StatusBadge from '../components/StatusBadge';

const validStatuses = ['queued', 'active', 'blocked', 'awaiting-review', 'merged'];

export default function CellDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'scope' | 'blocker' | 'handoff' | 'history'>('scope');
  const [statusNote, setStatusNote] = useState('');

  const { data: cell, isLoading, error } = useQuery({
    queryKey: ['cell', id],
    queryFn: () => fetchCell(Number(id)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ status, note }: { status: string; note?: string }) =>
      updateCellStatus(Number(id), status, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cell', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setStatusNote('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCell(Number(id)),
    onSuccess: () => navigate('/cells'),
  });

  if (isLoading) return <p className="text-gray-500">Loading cell...</p>;
  if (error) return <p className="text-red-600">Error: {(error as Error).message}</p>;
  if (!cell) return null;

  const tabs = [
    { key: 'scope' as const, label: 'Scope' },
    { key: 'blocker' as const, label: 'Blocker' },
    { key: 'handoff' as const, label: 'Handoff' },
    { key: 'history' as const, label: 'History' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{cell.feature}</h2>
          <p className="text-gray-500">
            {cell.project} &middot; <span className="font-mono text-xs">{cell.branch}</span>
          </p>
        </div>
        <StatusBadge status={cell.status} />
      </div>

      {/* Links */}
      <div className="flex gap-3 text-sm">
        {cell.github_issue_url && (
          <a href={cell.github_issue_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            GitHub Issue
          </a>
        )}
        {cell.github_pr_url && (
          <a href={cell.github_pr_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Pull Request
          </a>
        )}
      </div>

      {/* Status transitions */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-500 mb-2">Transition Status</h3>
        <div className="flex flex-wrap gap-2 items-end">
          {validStatuses
            .filter((s) => s !== cell.status)
            .map((s) => (
              <button
                key={s}
                onClick={() => statusMutation.mutate({ status: s, note: statusNote || undefined })}
                disabled={statusMutation.isPending}
                className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                &rarr; {s}
              </button>
            ))}
          <input
            type="text"
            placeholder="Note (optional)"
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm flex-1 min-w-[200px]"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-lg shadow p-4 min-h-[200px]">
        {activeTab === 'scope' && (
          cell.scope ? (
            <pre className="text-sm bg-gray-50 p-4 rounded overflow-auto">
              {JSON.stringify(cell.scope, null, 2)}
            </pre>
          ) : (
            <p className="text-gray-400">No scope data</p>
          )
        )}

        {activeTab === 'blocker' && (
          cell.blocker ? (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{cell.blocker}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-gray-400">No blocker</p>
          )
        )}

        {activeTab === 'handoff' && (
          cell.handoff ? (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{cell.handoff}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-gray-400">No handoff</p>
          )
        )}

        {activeTab === 'history' && (
          cell.history && cell.history.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {cell.history.map((h) => (
                <li key={h.id} className="flex items-center gap-2">
                  <span className="text-gray-400 w-40 shrink-0">
                    {new Date(h.changed_at).toLocaleString()}
                  </span>
                  {h.from_status && <StatusBadge status={h.from_status} />}
                  <span className="text-gray-400">&rarr;</span>
                  <StatusBadge status={h.to_status} />
                  {h.note && <span className="text-gray-500">{h.note}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">No history</p>
          )
        )}
      </div>

      {/* Danger zone */}
      <div className="border border-red-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-red-600 mb-2">Danger Zone</h3>
        <button
          onClick={() => {
            if (confirm('Delete this cell? This cannot be undone.')) {
              deleteMutation.mutate();
            }
          }}
          disabled={deleteMutation.isPending}
          className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
        >
          Delete Cell
        </button>
      </div>
    </div>
  );
}

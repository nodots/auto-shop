import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMergeQueue, removeFromMergeQueue, reorderMergeQueue } from '../api';
import StatusBadge from '../components/StatusBadge';

export default function MergeQueue() {
  const queryClient = useQueryClient();

  const { data: queue, isLoading, error } = useQuery({
    queryKey: ['merge-queue'],
    queryFn: fetchMergeQueue,
  });

  const removeMutation = useMutation({
    mutationFn: removeFromMergeQueue,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['merge-queue'] }),
  });

  const reorderMutation = useMutation({
    mutationFn: reorderMergeQueue,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['merge-queue'] }),
  });

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (!queue) return;
    const newQueue = [...queue];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newQueue.length) return;

    [newQueue[index], newQueue[swapIndex]] = [newQueue[swapIndex], newQueue[index]];
    const order = newQueue.map((item, i) => ({ id: item.id, position: i + 1 }));
    reorderMutation.mutate(order);
  };

  if (isLoading) return <p className="text-gray-500">Loading merge queue...</p>;
  if (error) return <p className="text-red-600">Error: {(error as Error).message}</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Merge Queue</h2>

      {!queue || queue.length === 0 ? (
        <p className="text-gray-400 py-8 text-center">Merge queue is empty</p>
      ) : (
        <div className="space-y-2">
          {queue.map((item, index) => (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow p-4 flex items-center gap-4"
            >
              <span className="text-2xl font-bold text-gray-300 w-8 text-center">
                {index + 1}
              </span>

              <div className="flex-1">
                <div className="font-medium">{item.feature}</div>
                <div className="text-sm text-gray-500">
                  {item.project} &middot;{' '}
                  <span className="font-mono text-xs">{item.branch}</span>
                </div>
              </div>

              <StatusBadge status={item.status} />

              {item.github_pr_url && (
                <a
                  href={item.github_pr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  PR
                </a>
              )}

              <div className="flex flex-col gap-1">
                <button
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0 || reorderMutation.isPending}
                  className="px-2 py-0.5 text-xs border rounded hover:bg-gray-50 disabled:opacity-30"
                >
                  Up
                </button>
                <button
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === queue.length - 1 || reorderMutation.isPending}
                  className="px-2 py-0.5 text-xs border rounded hover:bg-gray-50 disabled:opacity-30"
                >
                  Down
                </button>
              </div>

              <button
                onClick={() => removeMutation.mutate(item.id)}
                disabled={removeMutation.isPending}
                className="text-red-500 hover:text-red-700 text-sm disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

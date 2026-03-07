import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProjectsRaw, syncProjects, type ProjectData } from '../api';

export default function Projects() {
  const queryClient = useQueryClient();

  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['projects-raw'],
    queryFn: fetchProjectsRaw,
  });

  const syncMutation = useMutation({
    mutationFn: syncProjects,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  if (isLoading) return <p className="text-gray-500">Loading projects...</p>;
  if (error) return <p className="text-red-600">Error: {(error as Error).message}</p>;
  if (!projects) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Projects</h2>
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {syncMutation.isPending ? 'Syncing...' : 'Sync to DB'}
        </button>
      </div>

      {syncMutation.isSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded p-3 text-sm">
          Synced {syncMutation.data?.synced} project(s) to database
        </div>
      )}

      <div className="grid gap-4">
        {Object.entries(projects).map(([name, proj]: [string, ProjectData]) => (
          <div key={name} className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-bold">{name}</h3>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div className="text-gray-500">Repository</div>
              <div className="font-mono text-xs">{proj.repo}</div>
              <div className="text-gray-500">Default Branch</div>
              <div>{proj.defaultBranch}</div>
              <div className="text-gray-500">Feature Target</div>
              <div>{proj.featureTarget}</div>
              <div className="text-gray-500">Promotion Path</div>
              <div>{proj.promotionPath.join(' → ')}</div>
            </div>

            {proj.packages && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">
                  Packages ({Object.keys(proj.packages).length})
                </h4>
                <div className="grid gap-2">
                  {Object.entries(proj.packages).map(([pkgName, pkg]) => (
                    <div key={pkgName} className="bg-gray-50 rounded p-2 text-sm">
                      <span className="font-medium">{pkgName}</span>
                      <span className="text-gray-400 ml-2 font-mono text-xs">{pkg.repo}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

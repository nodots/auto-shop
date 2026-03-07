import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { createCell, fetchProjectsRaw } from '../api';

export default function CellCreate() {
  const navigate = useNavigate();
  const [feature, setFeature] = useState('');
  const [project, setProject] = useState('');
  const [branch, setBranch] = useState('');
  const [issueUrl, setIssueUrl] = useState('');
  const [error, setError] = useState('');

  const { data: projects } = useQuery({
    queryKey: ['projects-raw'],
    queryFn: fetchProjectsRaw,
  });

  const mutation = useMutation({
    mutationFn: createCell,
    onSuccess: (cell) => navigate(`/cells/${cell.id}`),
    onError: (err: Error) => setError(err.message),
  });

  // Auto-generate branch from feature name
  const handleFeatureChange = (value: string) => {
    setFeature(value);
    const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setBranch(`feat/${slug}`);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">Create Cell</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">{error}</div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!feature || !project || !branch) {
            setError('Feature, project, and branch are required');
            return;
          }
          mutation.mutate({
            feature,
            project,
            branch,
            github_issue_url: issueUrl || undefined,
          });
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Feature Name</label>
          <input
            type="text"
            value={feature}
            onChange={(e) => handleFeatureChange(e.target.value)}
            placeholder="e.g. user-registration"
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
          <select
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm"
          >
            <option value="">Select project...</option>
            {projects &&
              Object.keys(projects).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
          <input
            type="text"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm font-mono"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            GitHub Issue URL <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="url"
            value={issueUrl}
            onChange={(e) => setIssueUrl(e.target.value)}
            placeholder="https://github.com/owner/repo/issues/123"
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Creating...' : 'Create Cell'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/cells')}
            className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

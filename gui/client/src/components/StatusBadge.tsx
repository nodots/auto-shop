const statusColors: Record<string, string> = {
  queued: 'bg-gray-100 text-gray-700',
  active: 'bg-blue-100 text-blue-700',
  blocked: 'bg-red-100 text-red-700',
  'awaiting-review': 'bg-yellow-100 text-yellow-700',
  merged: 'bg-green-100 text-green-700',
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
        statusColors[status] || 'bg-gray-100 text-gray-700'
      }`}
    >
      {status}
    </span>
  );
}

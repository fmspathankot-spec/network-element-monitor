'use client'

interface ElementListProps {
  elements: any[]
  onRefresh: () => void
}

export default function ElementList({ elements, onRefresh }: ElementListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'inactive': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Network Elements</h2>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Refresh
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {elements.map((element) => (
              <tr key={element._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{element.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{element.ip_address}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{element.type}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{element.location || 'N/A'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(element.status)}`}>
                    {element.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {elements.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No network elements found
          </div>
        )}
      </div>
    </div>
  )
}

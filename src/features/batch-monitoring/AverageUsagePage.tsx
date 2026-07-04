import { useParams } from 'react-router-dom'

const labels: Record<string, string> = {
  'shrink-bag': 'Shrink Bag',
  'carton': 'Carton',
  'liners': 'Liners',
  'soakerpad': 'Soakerpad',
  'poly-label': 'Poly Label',
}

export function AverageUsagePage() {
  const { category } = useParams()
  const label = category ? labels[category] ?? category : null

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-1 text-white">Average Usage{label ? ` — ${label}` : ''}</h1>
      <p className="text-sm" style={{ color: '#3a6a8a' }}>Product usage averages over time.</p>
    </div>
  )
}

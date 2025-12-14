export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="space-y-4 text-center">
        <div className="inline-block">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-500">Loading...</p>
      </div>
    </div>
  )
}

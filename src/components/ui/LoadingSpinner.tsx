export function LoadingSpinner({ message = 'Chargement...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-[13px] text-gray-400">{message}</p>
    </div>
  )
}

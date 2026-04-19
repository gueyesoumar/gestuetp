export function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-red-50 p-3 text-[13px] text-error">
      {message}
    </div>
  )
}

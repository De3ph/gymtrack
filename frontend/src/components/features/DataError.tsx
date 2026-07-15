import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

interface DataErrorProps {
  title?: string
  message: string
}

/**
 * Server-component-friendly error display using the existing Alert
 * component with the destructive variant. Place inside a Suspense
 * boundary wherever a server data fetch may fail.
 */
export function DataError({ title = 'Error', message }: DataErrorProps) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

"use client";

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface DataErrorProps {
  title?: string
  message: string
  /** Client-side retry action (e.g. a query's `refetch`). Renders a button. */
  onRetry?: () => void
}

/**
 * Error display using the Alert component with the destructive variant.
 * Works both inside a Suspense boundary wherever a server data fetch may
 * fail and in client components — pass `onRetry` alongside a query's
 * `refetch` to make the failure retryable.
 */
export function DataError({ title: titleProp, message, onRetry }: DataErrorProps) {
  const tCommon = useTranslations('common.actions')
  const tErrors = useTranslations('common.errors')
  const title = titleProp ?? tErrors('error_title')

  return (
    <Alert variant="destructive">
      <AlertCircle className="size-5" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="col-start-2 mt-3 justify-self-start"
          onClick={onRetry}
        >
          {tCommon('retry')}
        </Button>
      )}
    </Alert>
  )
}

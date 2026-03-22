import { getNotificationLog } from '@/app/actions/admin-notifications'
import { NotificationPageClient } from './notification-page-client'

export default async function AdminNotificationsPage() {
  const result = await getNotificationLog()

  if ('error' in result) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-red-600">{result.error}</p>
      </main>
    )
  }

  return <NotificationPageClient initialNotifications={result.data!} />
}

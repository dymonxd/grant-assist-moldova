import {
  getFunnelData,
  getRecentActivity,
  getApplicationsList,
} from '@/app/actions/admin-analytics'
import { AdminDashboardClient } from './dashboard-client'

export default async function AdminPage() {
  const [funnelResult, activityResult, applicationsResult] = await Promise.all([
    getFunnelData(),
    getRecentActivity(),
    getApplicationsList(),
  ])

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Panou de administrare
        </h1>
        <p className="text-muted-foreground mt-1">
          Analiza conversiilor, activitate recenta si aplicatii active
        </p>
      </div>

      <AdminDashboardClient
        funnelStages={funnelResult.data ?? []}
        funnelError={funnelResult.error}
        activityEvents={activityResult.data ?? []}
        activityError={activityResult.error}
        applications={applicationsResult.data ?? []}
        applicationsError={applicationsResult.error}
      />
    </div>
  )
}

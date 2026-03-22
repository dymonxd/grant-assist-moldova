'use client'

import { useState, useTransition } from 'react'
import type {
  FunnelStage,
  StageDetailData,
  ActivityEvent,
  ApplicationListItem,
} from '@/app/actions/admin-analytics'
import { getStageDetail, sendStaleReminder } from '@/app/actions/admin-analytics'
import { FunnelBar } from './components/funnel-bar'
import { StageDetail } from './components/stage-detail'
import { ActivityFeed } from './components/activity-feed'
import { ApplicationsTable } from './components/applications-table'

interface AdminDashboardClientProps {
  funnelStages: FunnelStage[]
  funnelError?: string
  activityEvents: ActivityEvent[]
  activityError?: string
  applications: ApplicationListItem[]
  applicationsError?: string
}

export function AdminDashboardClient({
  funnelStages,
  funnelError,
  activityEvents,
  activityError,
  applications,
  applicationsError,
}: AdminDashboardClientProps) {
  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  const [stageData, setStageData] = useState<StageDetailData | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleStageClick(stage: string) {
    if (selectedStage === stage) {
      setSelectedStage(null)
      setStageData(null)
      return
    }

    setSelectedStage(stage)
    setStageData(null)

    startTransition(async () => {
      const result = await getStageDetail(stage)
      if (result.data) {
        setStageData(result.data)
      }
    })
  }

  async function handleSendReminder(
    applicationId: string
  ): Promise<{ error?: string }> {
    const result = await sendStaleReminder(applicationId)
    if (result.error) {
      return { error: result.error }
    }
    return {}
  }

  return (
    <div className="space-y-8">
      {/* Funnel section */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Analiza conversiilor</h2>
        {funnelError ? (
          <p className="text-sm text-red-600">{funnelError}</p>
        ) : (
          <div className="rounded-lg border border-border bg-card p-4">
            <FunnelBar
              stages={funnelStages}
              onStageClick={handleStageClick}
              selectedStage={selectedStage}
            />
          </div>
        )}

        {selectedStage && (
          <div className="mt-4">
            {isPending ? (
              <div className="rounded-lg border border-border bg-card p-6 animate-pulse">
                <div className="h-5 bg-muted rounded w-48 mb-4" />
                <div className="h-32 bg-muted rounded" />
              </div>
            ) : (
              <StageDetail stage={selectedStage} data={stageData} />
            )}
          </div>
        )}
      </section>

      {/* Two-column grid: Activity feed + Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Activity feed */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Activitate recenta</h2>
          {activityError ? (
            <p className="text-sm text-red-600">{activityError}</p>
          ) : (
            <div className="rounded-lg border border-border bg-card p-4">
              <ActivityFeed events={activityEvents} />
            </div>
          )}
        </section>

        {/* Applications table */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Aplicatii active</h2>
          {applicationsError ? (
            <p className="text-sm text-red-600">{applicationsError}</p>
          ) : (
            <div className="rounded-lg border border-border bg-card p-4">
              <ApplicationsTable
                applications={applications}
                onSendReminder={handleSendReminder}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

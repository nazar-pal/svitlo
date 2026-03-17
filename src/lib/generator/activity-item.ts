export interface SessionActivity {
  type: 'session'
  id: string
  timestamp: string
  startedByUserId: string
  startedAt: string
  stoppedAt: string | null
}

export interface MaintenanceActivity {
  type: 'maintenance'
  id: string
  timestamp: string
  performedByUserId: string
  performedAt: string
  templateName: string
  notes: string | null
}

export type ActivityItem = SessionActivity | MaintenanceActivity

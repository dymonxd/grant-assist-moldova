export interface CompanyFields {
  company_name: string | null
  industry: string | null
  location: string | null
  legal_form: string | null
}

export interface SourceResult {
  source: 'idno.md' | 'srl.md' | 'openmoney.md'
  status: 'success' | 'error' | 'timeout'
  confidence: number
  data: CompanyFields | null
  error?: string
}

export interface AggregateResult {
  merged: CompanyFields
  raw: Record<string, SourceResult>
  sourceStatus: Record<string, 'success' | 'error' | 'timeout'>
  isPartial: boolean
  allFailed: boolean
}

export type MergedProfile = CompanyFields

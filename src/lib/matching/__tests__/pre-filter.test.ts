import { describe, it, expect } from 'vitest'
import { preFilterGrants } from '../pre-filter'
import type { GrantWithRules } from '../types'
import type { CompanyFields } from '@/lib/sources/types'

// --- Helpers ---

function makeGrant(
  overrides: Partial<GrantWithRules> = {}
): GrantWithRules {
  return {
    id: 'grant-1',
    name: 'Test Grant',
    provider_agency: 'Agency',
    description: null,
    max_funding: 10000,
    currency: 'MDL',
    deadline: '2026-12-31',
    eligibility_rules: null,
    scoring_rubric: null,
    ...overrides,
  }
}

function makeProfile(
  overrides: Partial<CompanyFields & { purchase_need?: string | null }> = {}
): CompanyFields & { purchase_need?: string | null } {
  return {
    company_name: 'Test SRL',
    industry: 'Agricultura si cresterea animalelor',
    location: 'Moldova',
    legal_form: 'SRL',
    status: 'active',
    registration_date: '2020-01-01',
    activities: [],
    directors: [],
    founders: [],
    purchase_need: null,
    ...overrides,
  }
}

// --- Tests ---

describe('preFilterGrants', () => {
  it('passes grants with no eligibility_rules (null)', () => {
    const grants = [makeGrant({ eligibility_rules: null })]
    const profile = makeProfile()

    const result = preFilterGrants(grants, profile)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('grant-1')
  })

  it('passes grants with empty eligibility_rules array', () => {
    const grants = [makeGrant({ eligibility_rules: [] })]
    const profile = makeProfile()

    const result = preFilterGrants(grants, profile)

    expect(result).toHaveLength(1)
  })

  it('"equals" operator matches case-insensitively', () => {
    const grants = [
      makeGrant({
        eligibility_rules: [
          {
            rule: 'Compania din Moldova',
            field: 'location',
            operator: 'equals',
            value: 'Moldova',
          },
        ],
      }),
    ]
    const profile = makeProfile({ location: 'moldova' })

    const result = preFilterGrants(grants, profile)

    expect(result).toHaveLength(1)
  })

  it('"contains" operator matches substring case-insensitively', () => {
    const grants = [
      makeGrant({
        eligibility_rules: [
          {
            rule: 'Domeniul agricultura',
            field: 'industry',
            operator: 'contains',
            value: 'agricol',
          },
        ],
      }),
    ]
    const profile = makeProfile({
      industry: 'Agricultura si cresterea animalelor',
    })

    const result = preFilterGrants(grants, profile)

    expect(result).toHaveLength(1)
  })

  it('"gte" operator compares numerically (profile value >= rule value)', () => {
    const grants = [
      makeGrant({
        eligibility_rules: [
          {
            rule: 'Cel putin 1 an',
            field: 'company_age',
            operator: 'gte',
            value: 1,
          },
        ],
      }),
    ]
    const profile = makeProfile()
    // company_age is not on CompanyFields, so we set it via cast
    const profileWithAge = { ...profile, company_age: 5 }

    const result = preFilterGrants(grants, profileWithAge)

    expect(result).toHaveLength(1)
  })

  it('"lte" operator compares numerically (profile value <= rule value)', () => {
    const grants = [
      makeGrant({
        eligibility_rules: [
          {
            rule: 'Maxim 5 angajati',
            field: 'employee_count',
            operator: 'lte',
            value: 5,
          },
        ],
      }),
    ]
    const profileWithCount = { ...makeProfile(), employee_count: 3 }

    const result = preFilterGrants(grants, profileWithCount)

    expect(result).toHaveLength(1)
  })

  it('"in" operator checks array membership', () => {
    const grants = [
      makeGrant({
        eligibility_rules: [
          {
            rule: 'Forma juridica SRL sau SA',
            field: 'legal_form',
            operator: 'in',
            value: ['SRL', 'SA'],
          },
        ],
      }),
    ]
    const profile = makeProfile({ legal_form: 'SRL' })

    const result = preFilterGrants(grants, profile)

    expect(result).toHaveLength(1)
  })

  it('eliminates grant when ANY rule fails (all rules must pass)', () => {
    const grants = [
      makeGrant({
        eligibility_rules: [
          {
            rule: 'Locatie Moldova',
            field: 'location',
            operator: 'equals',
            value: 'Moldova',
          },
          {
            rule: 'Forma juridica SA',
            field: 'legal_form',
            operator: 'equals',
            value: 'SA',
          },
        ],
      }),
    ]
    // location matches but legal_form does not (SRL != SA)
    const profile = makeProfile({ location: 'Moldova', legal_form: 'SRL' })

    const result = preFilterGrants(grants, profile)

    expect(result).toHaveLength(0)
  })

  it('does NOT disqualify grant when profile field is missing (null)', () => {
    const grants = [
      makeGrant({
        eligibility_rules: [
          {
            rule: 'Industrie agricultura',
            field: 'industry',
            operator: 'contains',
            value: 'agricol',
          },
        ],
      }),
    ]
    const profile = makeProfile({ industry: null })

    const result = preFilterGrants(grants, profile)

    expect(result).toHaveLength(1)
  })

  it('does NOT disqualify grant for unknown operator', () => {
    const grants = [
      makeGrant({
        eligibility_rules: [
          {
            rule: 'Custom rule',
            field: 'location',
            operator: 'regex_match',
            value: '.*',
          },
        ],
      }),
    ]
    const profile = makeProfile()

    const result = preFilterGrants(grants, profile)

    expect(result).toHaveLength(1)
  })

  it('mixed scenario -- 3 grants, 1 disqualified, 2 pass through', () => {
    const grants = [
      // Grant 1: no rules -- passes
      makeGrant({ id: 'grant-a', eligibility_rules: null }),
      // Grant 2: location=Romania -- fails (profile is Moldova)
      makeGrant({
        id: 'grant-b',
        eligibility_rules: [
          {
            rule: 'Romania only',
            field: 'location',
            operator: 'equals',
            value: 'Romania',
          },
        ],
      }),
      // Grant 3: legal_form in [SRL, SA] -- passes (profile is SRL)
      makeGrant({
        id: 'grant-c',
        eligibility_rules: [
          {
            rule: 'SRL or SA',
            field: 'legal_form',
            operator: 'in',
            value: ['SRL', 'SA'],
          },
        ],
      }),
    ]
    const profile = makeProfile({ location: 'Moldova', legal_form: 'SRL' })

    const result = preFilterGrants(grants, profile)

    expect(result).toHaveLength(2)
    expect(result.map((g) => g.id)).toEqual(['grant-a', 'grant-c'])
  })
})

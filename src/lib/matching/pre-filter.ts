import type { GrantWithRules } from './types'
import type { CompanyFields } from '@/lib/sources/types'

/**
 * Rule-based eligibility pre-filter.
 *
 * Eliminates grants whose eligibility rules explicitly disqualify the company
 * profile. Grants with no rules or empty rules pass through. Missing profile
 * data or unknown operators also pass (do not disqualify -- the AI ranking
 * step handles nuanced assessment).
 */
export function preFilterGrants(
  grants: GrantWithRules[],
  profile: CompanyFields & Record<string, unknown>
): GrantWithRules[] {
  return grants.filter((grant) => {
    if (!grant.eligibility_rules || grant.eligibility_rules.length === 0) {
      return true
    }

    return grant.eligibility_rules.every((rule) => {
      const profileValue = getProfileField(profile, rule.field)

      // Missing profile data = do not disqualify (AI will assess)
      if (profileValue === null || profileValue === undefined) {
        return true
      }

      return evaluateRule(rule.operator, profileValue, rule.value)
    })
  })
}

/**
 * Maps eligibility rule field names to company profile field values.
 */
function getProfileField(
  profile: Record<string, unknown>,
  field: string
): unknown {
  const fieldMap: Record<string, string> = {
    location: 'location',
    industry: 'industry',
    legal_form: 'legal_form',
    company_size: 'company_size',
    company_age: 'company_age',
    revenue: 'revenue',
    employee_count: 'employee_count',
  }

  return profile[fieldMap[field] ?? field] ?? null
}

/**
 * Evaluates a single eligibility rule against a profile value.
 *
 * Supported operators: equals, contains, gte, lte, in.
 * Unknown operators return true (do not disqualify).
 */
function evaluateRule(
  operator: string,
  profileValue: unknown,
  ruleValue: unknown
): boolean {
  switch (operator) {
    case 'equals':
      return (
        String(profileValue).toLowerCase() ===
        String(ruleValue).toLowerCase()
      )

    case 'contains':
      return String(profileValue)
        .toLowerCase()
        .includes(String(ruleValue).toLowerCase())

    case 'gte':
      return Number(profileValue) >= Number(ruleValue)

    case 'lte':
      return Number(profileValue) <= Number(ruleValue)

    case 'in':
      return (
        Array.isArray(ruleValue) && ruleValue.includes(String(profileValue))
      )

    default:
      return true // Unknown operator = do not disqualify
  }
}

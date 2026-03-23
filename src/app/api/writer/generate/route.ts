import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { NextResponse } from 'next/server'
import {
  buildSectionPrompt,
  buildSystemPrompt,
} from '@/lib/ai/generate-section'

// Simple in-memory rate limiter (per-IP, 10 requests per minute)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60_000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

/**
 * POST /api/writer/generate
 *
 * Streaming Route Handler for AI section generation.
 * Accepts section context (field info, rubric, company profile, user brief)
 * and streams Romanian grant application text using gpt-5.4-nano.
 *
 * Returns text/plain stream for client-side progressive consumption.
 * No authentication required -- anonymous users allowed per AUTH-04.
 *
 * Does NOT use Server Actions (they cannot stream).
 * Does NOT set Content-Length (blocks streaming).
 */
export async function POST(req: Request) {
  // Rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Prea multe cereri. Incercati din nou in cateva minute.' },
      { status: 429 }
    )
  }

  const body = await req.json()

  const {
    fieldLabel,
    helperText,
    characterLimit,
    scoringRubric,
    companyProfile,
    userBrief,
  } = body

  // Validate required fields
  if (!fieldLabel || !companyProfile || !userBrief) {
    return NextResponse.json(
      { error: 'Campurile fieldLabel, companyProfile si userBrief sunt obligatorii' },
      { status: 400 }
    )
  }

  // Guard against oversized payloads to prevent token cost abuse
  const profileStr = JSON.stringify(companyProfile)
  if (profileStr.length > 10_000) {
    return NextResponse.json(
      { error: 'Profilul companiei este prea mare' },
      { status: 400 }
    )
  }
  if (userBrief.length > 2000) {
    return NextResponse.json(
      { error: 'Raspunsul utilizatorului este prea lung' },
      { status: 400 }
    )
  }

  // Build prompts using the AI prompt builder
  const sectionPrompt = buildSectionPrompt(
    {
      field_label: fieldLabel,
      helper_text: helperText ?? null,
      character_limit: characterLimit ?? null,
    },
    scoringRubric ?? null,
    companyProfile,
    userBrief
  )

  const result = streamText({
    model: openai('gpt-5.4-nano'),
    system: buildSystemPrompt(),
    prompt: sectionPrompt,
    maxOutputTokens: 2000,
  })

  return result.toTextStreamResponse()
}

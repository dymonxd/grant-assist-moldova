import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { NextResponse } from 'next/server'
import {
  buildSectionPrompt,
  buildSystemPrompt,
} from '@/lib/ai/generate-section'

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
    maxTokens: 2000,
  })

  return result.toTextStreamResponse()
}

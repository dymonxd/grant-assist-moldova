import { generateText, Output } from 'ai'
import { z } from 'zod'

const companyProfileSchema = z.object({
  company_name: z
    .string()
    .nullable()
    .describe('Numele sugerat al companiei pe baza ideii de afacere, sau null'),
  industry: z
    .string()
    .describe(
      'Sectorul industrial in limba romana (ex: "Agricultura", "IT", "Comert", "HoReCa")'
    ),
  location: z
    .string()
    .nullable()
    .describe('Locatia daca este mentionata, implicit "Moldova"'),
  legal_form: z
    .string()
    .nullable()
    .describe('Forma juridica sugerata: SRL, II, SA, sau null'),
  company_size: z
    .enum(['micro', 'small', 'medium'])
    .describe('Dimensiunea estimata a companiei pe baza descrierii'),
})

export type InferredProfile = z.infer<typeof companyProfileSchema>

export async function inferProfileFromIdea(
  businessIdea: string
): Promise<InferredProfile | null> {
  try {
    const { output } = await generateText({
      model: 'anthropic/claude-sonnet-4.6',
      output: Output.object({ schema: companyProfileSchema }),
      system: `Esti un asistent care analizeaza idei de afaceri din Moldova.
Extrage informatii despre companie din descrierea furnizata.
Raspunde doar cu datele structurate cerute. Foloseste limba romana pentru valorile campurilor.
Daca informatia nu este mentionata, pune null.
Presupune ca locatia este "Moldova" daca nu este specificata altfel.
Presupune dimensiunea "micro" daca nu exista indicii despre marimea companiei.`,
      prompt: businessIdea,
    })

    return output
  } catch {
    return null
  }
}

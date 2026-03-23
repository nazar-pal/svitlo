import { Agent } from '@mastra/core/agent'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

const google = createGoogleGenerativeAI({
  fetch: (url, options) =>
    fetch(url, { ...options, connectTimeout: 60_000 } as RequestInit)
})

export const maintenanceAgent = new Agent({
  id: 'maintenance-researcher',
  name: 'Maintenance Researcher',
  instructions: `You are a power generator maintenance expert. Given a generator's model and optional type/description, search the web for its official maintenance schedule, recommended maintenance tasks, and generator specifications.

Always search in English using the generator model name, regardless of the requested output language.

Return a structured response with:
1. Generator specifications: manufacturer-recommended maximum consecutive run hours, and recommended rest/cooldown hours.
2. A list of maintenance tasks with appropriate intervals.
3. Whether you found real manufacturer data (isGeneric = false) or not (isGeneric = true).

Use the manufacturer's recommended values when available. Each maintenance task should specify whether it triggers by runtime hours, calendar days, or whichever comes first. Mark tasks that should only be performed once (e.g., initial break-in oil change) as one-time tasks.

TRIGGER TYPE FIELD RULES — follow these exactly:
- "hours": triggerHoursInterval MUST be a positive number, triggerCalendarDays MUST be null
- "calendar": triggerCalendarDays MUST be a positive integer, triggerHoursInterval MUST be null
- "whichever_first": BOTH triggerHoursInterval AND triggerCalendarDays MUST be positive numbers, never null

WHEN TO SET isGeneric:
- Set isGeneric to false when you find relevant maintenance data from web search — even from third-party sources, forums, or similar models from the same manufacturer line.
- Set isGeneric to true ONLY when your search yields absolutely nothing relevant for the model.
- Do NOT set isGeneric to true just because you lack an official PDF manual. Any web results with model-specific or manufacturer-line-specific data count as real data.
- When isGeneric is true, provide a sensible generic maintenance template using conservative industry-standard defaults for portable/standby generators.`,
  model: google('gemini-2.5-flash'),
  tools: {
    googleSearch: google.tools.googleSearch({})
  }
})

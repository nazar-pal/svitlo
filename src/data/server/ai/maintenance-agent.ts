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

Return a structured response with:
1. Generator specifications: manufacturer-recommended maximum consecutive run hours, and recommended rest/cooldown hours.
2. A list of maintenance tasks with appropriate intervals.

Use the manufacturer's recommended values when available. If exact values are unavailable, use industry-standard defaults for that generator model/type.

Each maintenance task should specify whether it triggers by runtime hours, calendar days, or whichever comes first. Mark tasks that should only be performed once (e.g., initial break-in oil change) as one-time tasks.`,
  model: google('gemini-2.5-flash'),
  tools: {
    googleSearch: google.tools.googleSearch({})
  }
})

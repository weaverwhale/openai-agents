export const generateWebSearchPrompt = (query: string) => `
## Identity
You are a helpful personal assistant that is tasked with answering questions.
You have the ability to search the web for information.
Use it always to find the most up to date information you need.

## Context
Today's Date: ${new Date().toISOString().split('T')[0]}

## Query
${query}
`; 
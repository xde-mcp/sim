import type { ToolConfig } from '../types'
import type { ExaWebsetsParams, ExaWebsetsResponse } from './types'

export const createWebsetTool: ToolConfig<ExaWebsetsParams, ExaWebsetsResponse> = {
  id: 'exa_create_webset',
  name: 'Exa Create Webset',
  description:
    'Create a new Exa AI Webset for curated search collections. Returns immediately with webset ID.',
  version: '1.0.0',

  params: {
    query: {
      type: 'string',
      required: false,
      description:
        'Natural language search description for what to find (e.g., "Marketing agencies based in the US, that focus on consumer products")',
    },
    count: {
      type: 'number',
      required: false,
      description: 'Number of results to retrieve (default: 10)',
    },
    apiKey: {
      type: 'string',
      required: true,
      requiredForToolCall: true,
      description: 'Exa AI API Key',
    },
  },

  request: {
    url: 'https://api.exa.ai/websets/v0/websets',
    method: 'POST',
    isInternalRoute: false,
    headers: (params) => ({
      'Content-Type': 'application/json',
      'x-api-key': params.apiKey,
    }),
    body: (params) => {
      const body: Record<string, any> = {}

      if (params.query || params.count) {
        body.search = {}
        if (params.query) body.search.query = params.query
        if (params.count) body.search.count = params.count
      }

      return body
    },
  },

  transformResponse: async (response: Response) => {
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Failed to create Exa webset')
    }

    return {
      success: true,
      output: {
        webset: data,
      },
    }
  },

  transformError: (error) => {
    return error instanceof Error
      ? error.message
      : 'An error occurred while creating the Exa webset'
  },
}

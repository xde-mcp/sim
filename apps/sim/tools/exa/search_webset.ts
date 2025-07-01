import type { ToolConfig } from '../types'
import type { ExaWebsetsParams, ExaWebsetsResponse } from './types'

export const searchWebsetTool: ToolConfig<ExaWebsetsParams, ExaWebsetsResponse> = {
  id: 'exa_search_webset',
  name: 'Exa Search Webset',
  description:
    'Search within an existing Exa AI Webset. Use this to search the contents of a completed webset.',
  version: '1.0.0',

  params: {
    websetId: {
      type: 'string',
      required: true,
      requiredForToolCall: true,
      description: 'The webset ID to search within',
    },
    query: {
      type: 'string',
      required: true,
      description: 'Search query to search within the webset',
    },
    apiKey: {
      type: 'string',
      required: true,
      requiredForToolCall: true,
      description: 'Exa AI API Key',
    },
  },

  request: {
    url: (params) => `https://api.exa.ai/websets/v0/websets/${params.websetId}/searches`,
    method: 'POST',
    isInternalRoute: false,
    headers: (params) => ({
      'Content-Type': 'application/json',
      'x-api-key': params.apiKey,
    }),
    body: (params) => ({
      query: params.query,
    }),
  },

  transformResponse: async (response: Response) => {
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Failed to search Exa webset')
    }

    return {
      success: true,
      output: {
        searchResults: data.results || data,
      },
    }
  },

  transformError: (error) => {
    return error instanceof Error
      ? error.message
      : 'An error occurred while searching the Exa webset'
  },
}

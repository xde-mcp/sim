import type { ToolConfig } from '../types'
import type { ExaWebsetsParams, ExaWebsetsResponse } from './types'

export const getWebsetTool: ToolConfig<ExaWebsetsParams, ExaWebsetsResponse> = {
  id: 'exa_get_webset',
  name: 'Exa Get Webset',
  description:
    'Get the status and details of an existing Exa AI Webset. Use this to check if a webset is complete.',
  version: '1.0.0',

  params: {
    websetId: {
      type: 'string',
      required: true,
      requiredForToolCall: true,
      description: 'The webset ID to retrieve',
    },
    apiKey: {
      type: 'string',
      required: true,
      requiredForToolCall: true,
      description: 'Exa AI API Key',
    },
  },

  request: {
    url: (params) => `https://api.exa.ai/websets/v0/websets/${params.websetId}`,
    method: 'GET',
    isInternalRoute: false,
    headers: (params) => ({
      'x-api-key': params.apiKey,
    }),
  },

  transformResponse: async (response: Response) => {
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Failed to get Exa webset')
    }

    return {
      success: true,
      output: {
        webset: data,
      },
    }
  },

  transformError: (error) => {
    return error instanceof Error ? error.message : 'An error occurred while getting the Exa webset'
  },
}

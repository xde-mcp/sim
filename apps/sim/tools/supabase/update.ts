import type { SupabaseUpdateParams, SupabaseUpdateResponse } from '@/tools/supabase/types'
import type { ToolConfig } from '@/tools/types'

export const updateTool: ToolConfig<SupabaseUpdateParams, SupabaseUpdateResponse> = {
  id: 'supabase_update',
  name: 'Supabase Update Row',
  description: 'Update rows in a Supabase table based on filter criteria',
  version: '1.0',
  params: {
    projectId: {
      type: 'string',
      required: true,
      visibility: 'user-only',
      description: 'Your Supabase project ID (e.g., jdrkgepadsdopsntdlom)',
    },
    table: {
      type: 'string',
      required: true,
      visibility: 'user-only',
      description: 'The name of the Supabase table to update',
    },
    filter: {
      type: 'object',
      required: true,
      visibility: 'user-or-llm',
      description: 'Filter criteria to identify rows to update (e.g., {"id": 123})',
    },
    data: {
      type: 'object',
      required: true,
      visibility: 'user-or-llm',
      description: 'Data to update in the matching rows',
    },
    apiKey: {
      type: 'string',
      required: true,
      visibility: 'hidden',
      description: 'Your Supabase service role secret key',
    },
  },
  request: {
    url: (params) => `https://${params.projectId}.supabase.co/rest/v1/${params.table}`,
    method: 'PATCH',
    headers: (params) => ({
      apikey: params.apiKey,
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    }),
  },
  directExecution: async (params: SupabaseUpdateParams) => {
    try {
      // Construct the URL for the Supabase REST API
      let url = `https://${params.projectId}.supabase.co/rest/v1/${params.table}`

      // Add filters (required for update)
      if (params.filter && Object.keys(params.filter).length > 0) {
        const filterParams = new URLSearchParams()
        Object.entries(params.filter).forEach(([key, value]) => {
          filterParams.append(key, `eq.${value}`)
        })
        url += `?${filterParams.toString()}`
      }

      // Fetch the data
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          apikey: params.apiKey,
          Authorization: `Bearer ${params.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params.data),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Error from Supabase: ${response.status} ${errorText}`)
      }

      const data = await response.json()

      return {
        success: true,
        output: {
          message: `Successfully updated ${Array.isArray(data) ? data.length : 1} row(s) in ${params.table}`,
          results: data,
        },
        error: undefined,
      }
    } catch (error) {
      return {
        success: false,
        output: {
          message: `Error updating rows in Supabase: ${error instanceof Error ? error.message : String(error)}`,
          results: null,
        },
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
  transformResponse: async (response: Response) => {
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to update rows in Supabase')
    }

    const data = await response.json()

    return {
      success: true,
      output: {
        message: `Successfully updated ${Array.isArray(data) ? data.length : 1} row(s)`,
        results: data,
      },
      error: undefined,
    }
  },
  transformError: (error: any) => {
    return error.message || 'An error occurred while updating rows in Supabase'
  },
}

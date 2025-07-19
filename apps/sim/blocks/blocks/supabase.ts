import { SupabaseIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import type { SupabaseResponse } from '@/tools/supabase/types'

export const SupabaseBlock: BlockConfig<SupabaseResponse> = {
  type: 'supabase',
  name: 'Supabase',
  description: 'Use Supabase database',
  longDescription:
    'Integrate with Supabase to manage your database, authentication, storage, and more. Query data, manage users, and interact with Supabase services directly.',
  docsLink: 'https://docs.simstudio.ai/tools/supabase',
  category: 'tools',
  bgColor: '#1C1C1C',
  icon: SupabaseIcon,
  subBlocks: [
    {
      id: 'operation',
      title: 'Operation',
      type: 'dropdown',
      layout: 'full',
      options: [
        { label: 'Get Many Rows', id: 'query' },
        { label: 'Get a Row', id: 'get_row' },
        { label: 'Create a Row', id: 'insert' },
        { label: 'Update a Row', id: 'update' },
        { label: 'Delete a Row', id: 'delete' },
      ],
    },
    {
      id: 'projectId',
      title: 'Project ID',
      type: 'short-input',
      layout: 'full',
      placeholder: 'Your Supabase project ID (e.g., jdrkgepadsdopsntdlom)',
    },
    {
      id: 'table',
      title: 'Table',
      type: 'short-input',
      layout: 'full',
      placeholder: 'Name of the table',
    },
    {
      id: 'apiKey',
      title: 'Service Role Secret',
      type: 'short-input',
      layout: 'full',
      placeholder: 'Your Supabase service role secret key',
      password: true,
    },
    // Data input for create/update operations
    {
      id: 'data',
      title: 'Data',
      type: 'code',
      layout: 'full',
      placeholder: '{\n  "column1": "value1",\n  "column2": "value2"\n}',
      condition: { field: 'operation', value: 'insert' },
    },
    {
      id: 'data',
      title: 'Data',
      type: 'code',
      layout: 'full',
      placeholder: '{\n  "column1": "value1",\n  "column2": "value2"\n}',
      condition: { field: 'operation', value: 'update' },
    },
    // Filter/WHERE clause for get_row, update, delete operations
    {
      id: 'filter',
      title: 'Filter (WHERE clause)',
      type: 'code',
      layout: 'full',
      placeholder: '{\n  "id": 123\n}',
      condition: { field: 'operation', value: 'get_row' },
    },
    {
      id: 'filter',
      title: 'Filter (WHERE clause)',
      type: 'code',
      layout: 'full',
      placeholder: '{\n  "id": 123\n}',
      condition: { field: 'operation', value: 'update' },
    },
    {
      id: 'filter',
      title: 'Filter (WHERE clause)',
      type: 'code',
      layout: 'full',
      placeholder: '{\n  "id": 123\n}',
      condition: { field: 'operation', value: 'delete' },
    },
    // Optional filters for query operation
    {
      id: 'filter',
      title: 'Filter',
      type: 'code',
      layout: 'full',
      placeholder: '{\n  "status": "active"\n}',
      condition: { field: 'operation', value: 'query' },
    },
    // Optional order by for query operation
    {
      id: 'orderBy',
      title: 'Order By',
      type: 'short-input',
      layout: 'full',
      placeholder: 'column_name (add DESC for descending)',
      condition: { field: 'operation', value: 'query' },
    },
    // Optional limit for query operation
    {
      id: 'limit',
      title: 'Limit',
      type: 'short-input',
      layout: 'full',
      placeholder: '100',
      condition: { field: 'operation', value: 'query' },
    },
  ],
  tools: {
    access: [
      'supabase_query',
      'supabase_insert',
      'supabase_get_row',
      'supabase_update',
      'supabase_delete',
    ],
    config: {
      tool: (params) => {
        switch (params.operation) {
          case 'query':
            return 'supabase_query'
          case 'insert':
            return 'supabase_insert'
          case 'get_row':
            return 'supabase_get_row'
          case 'update':
            return 'supabase_update'
          case 'delete':
            return 'supabase_delete'
          default:
            throw new Error(`Invalid Supabase operation: ${params.operation}`)
        }
      },
      params: (params) => {
        const { operation, data, filter, ...rest } = params

        // Parse JSON data if it's a string
        let parsedData
        if (data && typeof data === 'string' && data.trim()) {
          try {
            parsedData = JSON.parse(data)
          } catch (_e) {
            throw new Error('Invalid JSON data format')
          }
        } else if (data && typeof data === 'object') {
          parsedData = data
        }

        // Parse JSON filter if it's a string
        let parsedFilter
        if (filter && typeof filter === 'string' && filter.trim()) {
          try {
            parsedFilter = JSON.parse(filter)
          } catch (_e) {
            throw new Error('Invalid JSON filter format')
          }
        } else if (filter && typeof filter === 'object') {
          parsedFilter = filter
        }

        // Build params object, only including defined values
        const result = { ...rest }

        if (parsedData !== undefined) {
          result.data = parsedData
        }

        if (parsedFilter !== undefined) {
          result.filter = parsedFilter
        }

        return result
      },
    },
  },
  inputs: {
    operation: { type: 'string', required: true },
    projectId: { type: 'string', required: true },
    table: { type: 'string', required: true },
    apiKey: { type: 'string', required: true },
    // Data for insert/update operations
    data: { type: 'json', required: false },
    // Filter for get_row/update/delete/query operations
    filter: { type: 'json', required: false },
    // Query operation inputs
    orderBy: { type: 'string', required: false },
    limit: { type: 'number', required: false },
  },
  outputs: {
    message: 'string',
    results: 'json',
  },
}

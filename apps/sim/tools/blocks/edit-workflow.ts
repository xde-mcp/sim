import type { ToolConfig, ToolResponse } from '../types'

interface EditWorkflowParams {
  yamlContent: string
  description?: string
  _context?: {
    workflowId: string
  }
}

interface EditWorkflowResult {
  success: boolean
  message: string
  summary?: string
  errors?: string[]
  warnings?: string[]
}

interface EditWorkflowResponse extends ToolResponse {
  output: EditWorkflowResult
}

export const editWorkflowTool: ToolConfig<EditWorkflowParams, EditWorkflowResponse> = {
  id: 'edit_workflow',
  name: 'Edit Workflow',
  description:
    'Save/edit the current workflow by providing YAML content. This performs the same action as saving in the YAML code editor. Only call this after getting blocks info, metadata, and YAML structure guide.',
  version: '1.0.0',

  params: {
    yamlContent: {
      type: 'string',
      required: true,
      description: 'The complete YAML workflow content to save',
    },
    description: {
      type: 'string',
      required: false,
      description: 'Optional description of the changes being made',
    },
  },

  request: {
    url: '/api/tools/edit-workflow',
    method: 'POST',
    headers: () => ({
      'Content-Type': 'application/json',
    }),
    body: (params) => ({
      yamlContent: params.yamlContent,
      workflowId: params._context?.workflowId,
      description: params.description,
    }),
    isInternalRoute: true,
  },

  transformResponse: async (
    response: Response
  ): Promise<EditWorkflowResponse> => {
    if (!response.ok) {
      throw new Error(`Edit workflow failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || 'Failed to edit workflow')
    }

    return {
      success: true,
      output: data.data,
    }
  },

  transformError: (error: any): string => {
    if (error instanceof Error) {
      return `Failed to edit workflow: ${error.message}`
    }
    return 'An unexpected error occurred while editing the workflow'
  },
} 
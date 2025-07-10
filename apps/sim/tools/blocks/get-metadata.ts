import type { ToolConfig, ToolResponse } from '../types'

interface GetBlockMetadataParams {
  blockIds: string[]
}

interface BlockMetadataInfo {
  description: string
  longDescription?: string
  category: string
  inputs?: Record<string, any>
  outputs?: Record<string, any>
  subBlocks?: any[]
  tools: Record<
    string,
    {
      description: string
      params?: Record<string, any>
    }
  >
}

interface GetBlockMetadataResult {
  [blockId: string]: BlockMetadataInfo
}

interface GetBlockMetadataResponse extends ToolResponse {
  output: GetBlockMetadataResult
}

export const getBlockMetadataTool: ToolConfig<GetBlockMetadataParams, GetBlockMetadataResponse> = {
  id: 'get_blocks_metadata',
  name: 'Get Block Metadata',
  description:
    'Get detailed metadata including descriptions, schemas, inputs, outputs, and subblocks for specific blocks and their associated tools',
  version: '1.0.0',

  params: {
    blockIds: {
      type: 'array',
      required: true,
      description: 'Array of block IDs to get descriptions for',
    },
  },

  request: {
    url: '/api/tools/get-blocks-metadata',
    method: 'POST',
    headers: () => ({
      'Content-Type': 'application/json',
    }),
    body: (params) => ({
      blockIds: params.blockIds,
    }),
    isInternalRoute: true,
  },

  transformResponse: async (
    response: Response,
    params?: GetBlockMetadataParams
  ): Promise<GetBlockMetadataResponse> => {
    if (!response.ok) {
      throw new Error(`Get block metadata failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || 'Failed to get block metadata')
    }

    return {
      success: true,
      output: data.data,
    }
  },

  transformError: (error: any): string => {
    if (error instanceof Error) {
      return `Failed to get block metadata: ${error.message}`
    }
    return 'An unexpected error occurred while getting block metadata'
  },
}

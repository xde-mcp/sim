import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface JSONViewProps {
  data: any
}

const MAX_STRING_LENGTH = 150
const MAX_OBJECT_KEYS = 10
const MAX_ARRAY_ITEMS = 20

const TruncatedValue = ({ value }: { value: string }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  if (value.length <= MAX_STRING_LENGTH) {
    return (
      <span className='break-all font-[380] text-muted-foreground/80 leading-normal'>{value}</span>
    )
  }

  return (
    <span className='break-all font-[380] text-muted-foreground/80 leading-normal'>
      {isExpanded ? value : `${value.slice(0, MAX_STRING_LENGTH)}...`}
      <Button
        variant='link'
        size='sm'
        className='h-auto px-1 font-[380] text-muted-foreground text-xs hover:text-foreground'
        onClick={(e) => {
          e.stopPropagation()
          setIsExpanded(!isExpanded)
        }}
      >
        {isExpanded ? 'Show less' : 'Show more'}
      </Button>
    </span>
  )
}

const CollapsibleJSON = ({ data, depth = 0 }: { data: any; depth?: number }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  if (data === null) {
    return <span className='break-all font-[380] text-muted-foreground leading-normal'>null</span>
  }

  if (data === undefined) {
    return (
      <span className='break-all font-[380] text-muted-foreground leading-normal'>undefined</span>
    )
  }

  if (typeof data === 'string') {
    return <TruncatedValue value={JSON.stringify(data)} />
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return (
      <span className='break-all font-[380] text-muted-foreground/80 leading-normal'>
        {JSON.stringify(data)}
      </span>
    )
  }

  if (Array.isArray(data)) {
    const shouldCollapse = depth > 0 && data.length > MAX_ARRAY_ITEMS

    if (shouldCollapse && !isExpanded) {
      return (
        <span
          className='cursor-pointer break-all font-[380] text-muted-foreground text-xs leading-normal'
          onClick={() => setIsExpanded(true)}
        >
          {'[...]'}
        </span>
      )
    }

    return (
      <span className='break-all font-[380] text-muted-foreground leading-normal'>
        {'['}
        {data.length > 0 && (
          <>
            {'\n'}
            {data.map((item, index) => (
              <span key={index} className='break-all'>
                {'  '.repeat(depth + 1)}
                <CollapsibleJSON data={item} depth={depth + 1} />
                {index < data.length - 1 ? ',' : ''}
                {'\n'}
              </span>
            ))}
            {'  '.repeat(depth)}
          </>
        )}
        {']'}
      </span>
    )
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data)
    const shouldCollapse = depth > 0 && keys.length > MAX_OBJECT_KEYS

    if (shouldCollapse && !isExpanded) {
      return (
        <span
          className='cursor-pointer break-all font-[380] text-muted-foreground text-xs leading-normal'
          onClick={() => setIsExpanded(true)}
        >
          {'{...}'}
        </span>
      )
    }

    return (
      <span className='break-all font-[380] text-muted-foreground leading-normal'>
        {'{'}
        {keys.length > 0 && (
          <>
            {'\n'}
            {keys.map((key, index) => (
              <span key={key} className='break-all'>
                {'  '.repeat(depth + 1)}
                <span className='break-all font-[380] text-foreground leading-normal'>"{key}"</span>
                <span className='font-[380] text-muted-foreground leading-normal'>: </span>
                <CollapsibleJSON data={data[key]} depth={depth + 1} />
                {index < keys.length - 1 ? ',' : ''}
                {'\n'}
              </span>
            ))}
            {'  '.repeat(depth)}
          </>
        )}
        {'}'}
      </span>
    )
  }

  return (
    <span className='break-all font-[380] text-muted-foreground leading-normal'>
      {JSON.stringify(data)}
    </span>
  )
}

const copyToClipboard = (data: any) => {
  const stringified = JSON.stringify(data, null, 2)
  navigator.clipboard.writeText(stringified)
}

// Helper function to check if an object contains an image URL
const isImageData = (obj: any): boolean => {
  if (!obj || typeof obj !== 'object' || !('url' in obj) || typeof obj.url !== 'string') {
    return false
  }

  // Check if we have metadata with file type
  if (obj.metadata?.fileType) {
    return obj.metadata.fileType.startsWith('image/')
  }

  // Fallback to checking URL extension
  const url = obj.url.toLowerCase()
  return url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/) !== null
}

// Helper function to check if an object contains an audio URL
const isAudioData = (obj: any): boolean => {
  return obj && typeof obj === 'object' && 'audioUrl' in obj && typeof obj.audioUrl === 'string'
}

// Helper function to check if a string is likely a base64 image
const isBase64Image = (str: string): boolean => {
  if (typeof str !== 'string') return false
  // Check if it's a reasonably long string that could be a base64 image
  // and contains only valid base64 characters
  return str.length > 100 && /^[A-Za-z0-9+/=]+$/.test(str)
}

// Check if this is a response with the new image structure
// Strict validation to only detect actual image responses
const hasImageContent = (obj: any): boolean => {
  // Debug check - basic structure validation
  if (
    !(
      obj &&
      typeof obj === 'object' &&
      'content' in obj &&
      typeof obj.content === 'string' &&
      'metadata' in obj &&
      typeof obj.metadata === 'object'
    )
  ) {
    return false
  }

  // Case 1: Has explicit image data
  const hasExplicitImageData =
    'image' in obj &&
    typeof obj.image === 'string' &&
    obj.image.length > 0 &&
    isBase64Image(obj.image)

  if (hasExplicitImageData) {
    return true
  }

  // Case 2: Has explicit image type in metadata
  const hasExplicitImageType =
    obj.metadata?.type &&
    typeof obj.metadata.type === 'string' &&
    obj.metadata.type.toLowerCase() === 'image'

  if (hasExplicitImageType) {
    return true
  }

  // Case 3: Content URL points to an image file
  const isImageUrl =
    typeof obj.content === 'string' &&
    obj.content.startsWith('http') &&
    !!obj.content.toLowerCase().match(/\.(png|jpg|jpeg|gif|webp|svg)(\?|$)/)

  return isImageUrl
}

// Image preview component with support for both URL and base64
const ImagePreview = ({
  imageUrl,
  imageData,
  isBase64 = false,
}: {
  imageUrl?: string
  imageData?: string
  isBase64?: boolean
}) => {
  const [loadError, setLoadError] = useState(false)

  const downloadImage = async () => {
    try {
      let blob: Blob
      if (isBase64 && imageData && imageData.length > 0) {
        // Convert base64 to blob
        const byteString = atob(imageData)
        const arrayBuffer = new ArrayBuffer(byteString.length)
        const uint8Array = new Uint8Array(arrayBuffer)
        for (let i = 0; i < byteString.length; i++) {
          uint8Array[i] = byteString.charCodeAt(i)
        }
        blob = new Blob([arrayBuffer], { type: 'image/png' })
      } else if (imageUrl && imageUrl.length > 0) {
        // Use proxy endpoint to fetch image
        const proxyUrl = `/api/proxy/image?url=${encodeURIComponent(imageUrl)}`
        const response = await fetch(proxyUrl)
        if (!response.ok) {
          throw new Error(`Failed to download image: ${response.statusText}`)
        }
        blob = await response.blob()
      } else {
        throw new Error('No image data or URL provided')
      }

      // Create object URL and trigger download
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `generated-image-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up the URL
      setTimeout(() => URL.revokeObjectURL(url), 100)
    } catch (error) {
      console.error('Error downloading image:', error)
      alert('Failed to download image. Please try again later.')
    }
  }

  // Only display image if we have valid data
  const hasValidData =
    (isBase64 && imageData && imageData.length > 0) || (imageUrl && imageUrl.length > 0)

  if (!hasValidData) {
    return (
      <div className='my-2 font-[380] text-muted-foreground leading-normal'>
        Image data unavailable
      </div>
    )
  }

  if (loadError) {
    return (
      <div className='my-2 font-[380] text-muted-foreground leading-normal'>
        Failed to load image
      </div>
    )
  }

  // Determine the source for the image
  const imageSrc =
    isBase64 && imageData && imageData.length > 0
      ? `data:image/png;base64,${imageData}`
      : imageUrl || ''

  return (
    <div className='group relative my-2'>
      <img
        src={imageSrc}
        alt='Generated image'
        className='h-auto max-w-full rounded-lg border'
        onError={(e) => {
          console.error('Image failed to load:', imageSrc)
          setLoadError(true)
          e.currentTarget.alt = 'Failed to load image'
          e.currentTarget.style.height = '100px'
          e.currentTarget.style.width = '100%'
          e.currentTarget.style.display = 'flex'
          e.currentTarget.style.alignItems = 'center'
          e.currentTarget.style.justifyContent = 'center'
          e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.1)'
        }}
      />
      {!loadError && (
        <div className='absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100'>
          <Button
            variant='secondary'
            size='icon'
            className='h-8 w-8 bg-background/80 backdrop-blur-sm'
            onClick={(e) => {
              e.stopPropagation()
              downloadImage()
            }}
          >
            <Download className='h-4 w-4' />
            <span className='sr-only'>Download image</span>
          </Button>
        </div>
      )}
    </div>
  )
}

export const JSONView = ({ data }: JSONViewProps) => {
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number
    y: number
  } | null>(null)

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenuPosition({ x: e.clientX, y: e.clientY })
  }

  useEffect(() => {
    const handleClickOutside = () => setContextMenuPosition(null)
    if (contextMenuPosition) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenuPosition])

  // Check if this is a base64 image string
  const isBase64ImageString = typeof data === 'string' && isBase64Image(data)

  // Check if current object contains image URL
  const hasImageUrl = isImageData(data)

  // Check if current object contains audio URL
  const hasAudioUrl = isAudioData(data)

  // Check if this is a response object with the new image format
  const isResponseWithImage = hasImageContent(data)

  // Check if this is response.output with the new image structure
  const isToolResponseWithImage =
    data && typeof data === 'object' && data.output && hasImageContent(data.output)

  if (data === null)
    return <span className='font-[380] text-muted-foreground leading-normal'>null</span>

  // Handle base64 image strings directly
  if (isBase64ImageString) {
    return (
      <div onContextMenu={handleContextMenu}>
        <ImagePreview imageData={data} isBase64={true} />
        {contextMenuPosition && (
          <div
            className='fixed z-50 min-w-[160px] rounded-md border bg-popover py-1 shadow-md'
            style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
          >
            <button
              className='w-full px-3 py-1.5 text-left font-[380] text-sm hover:bg-accent'
              onClick={() => copyToClipboard(data)}
            >
              Copy base64 string
            </button>
            <button
              className='flex w-full items-center gap-2 px-3 py-1.5 text-left font-[380] text-sm hover:bg-accent'
              onClick={() => {
                document
                  .querySelector<HTMLButtonElement>('.group .bg-background\\/80 button')
                  ?.click()
              }}
            >
              <Download className='h-4 w-4' />
              Download image
            </button>
          </div>
        )}
      </div>
    )
  }

  // Handle objects with image URLs
  if (hasImageUrl) {
    return (
      <div onContextMenu={handleContextMenu}>
        <ImagePreview imageUrl={data.url} />
        <pre className='max-w-full overflow-hidden whitespace-pre-wrap break-all font-mono'>
          <CollapsibleJSON data={data} />
        </pre>
        {contextMenuPosition && (
          <div
            className='fixed z-50 min-w-[160px] rounded-md border bg-popover py-1 shadow-md'
            style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
          >
            <button
              className='w-full px-3 py-1.5 text-left font-[380] text-sm hover:bg-accent'
              onClick={() => copyToClipboard(data)}
            >
              Copy object
            </button>
            <button
              className='flex w-full items-center gap-2 px-3 py-1.5 text-left font-[380] text-sm hover:bg-accent'
              onClick={() => {
                document
                  .querySelector<HTMLButtonElement>('.group .bg-background\\/80 button')
                  ?.click()
              }}
            >
              <Download className='h-4 w-4' />
              Download image
            </button>
          </div>
        )}
      </div>
    )
  }

  // Handle objects with audio URLs
  if (hasAudioUrl) {
    return (
      <div onContextMenu={handleContextMenu}>
        <pre className='max-w-full overflow-hidden whitespace-pre-wrap break-all font-mono'>
          <CollapsibleJSON data={data} />
        </pre>
        {contextMenuPosition && (
          <div
            className='fixed z-50 min-w-[160px] rounded-md border bg-popover py-1 shadow-md'
            style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
          >
            <button
              className='w-full px-3 py-1.5 text-left font-[380] text-sm hover:bg-accent'
              onClick={() => copyToClipboard(data)}
            >
              Copy object
            </button>
          </div>
        )}
      </div>
    )
  }

  // Handle objects with the new image structure
  if (isResponseWithImage) {
    const imageUrl = data.content && typeof data.content === 'string' ? data.content : undefined
    const hasValidImage = data.image && typeof data.image === 'string' && data.image.length > 0

    return (
      <div onContextMenu={handleContextMenu}>
        <ImagePreview
          imageUrl={imageUrl}
          imageData={hasValidImage && isBase64Image(data.image) ? data.image : undefined}
          isBase64={hasValidImage && isBase64Image(data.image)}
        />
        <pre className='max-w-full overflow-hidden whitespace-pre-wrap break-all font-mono'>
          <CollapsibleJSON data={data} />
        </pre>
        {contextMenuPosition && (
          <div
            className='fixed z-50 min-w-[160px] rounded-md border bg-popover py-1 shadow-md'
            style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
          >
            <button
              className='w-full px-3 py-1.5 text-left font-[380] text-sm hover:bg-accent'
              onClick={() => copyToClipboard(data)}
            >
              Copy object
            </button>
            <button
              className='flex w-full items-center gap-2 px-3 py-1.5 text-left font-[380] text-sm hover:bg-accent'
              onClick={() => {
                document
                  .querySelector<HTMLButtonElement>('.group .bg-background\\/80 button')
                  ?.click()
              }}
            >
              <Download className='h-4 w-4' />
              Download image
            </button>
          </div>
        )}
      </div>
    )
  }

  // Handle tool response objects with the new image structure in output
  if (isToolResponseWithImage) {
    const outputData = data.output || {}
    const imageUrl =
      outputData.content && typeof outputData.content === 'string' ? outputData.content : undefined
    const hasValidImage =
      outputData.image && typeof outputData.image === 'string' && outputData.image.length > 0

    return (
      <div onContextMenu={handleContextMenu}>
        <ImagePreview
          imageUrl={imageUrl}
          imageData={
            hasValidImage && isBase64Image(outputData.image) ? outputData.image : undefined
          }
          isBase64={hasValidImage && isBase64Image(outputData.image)}
        />
        <pre className='max-w-full overflow-hidden whitespace-pre-wrap break-all font-mono'>
          <CollapsibleJSON data={data} />
        </pre>
        {contextMenuPosition && (
          <div
            className='fixed z-50 min-w-[160px] rounded-md border bg-popover py-1 shadow-md'
            style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
          >
            <button
              className='w-full px-3 py-1.5 text-left font-[380] text-sm hover:bg-accent'
              onClick={() => copyToClipboard(data)}
            >
              Copy object
            </button>
            <button
              className='flex w-full items-center gap-2 px-3 py-1.5 text-left font-[380] text-sm hover:bg-accent'
              onClick={() => {
                document
                  .querySelector<HTMLButtonElement>('.group .bg-background\\/80 button')
                  ?.click()
              }}
            >
              <Download className='h-4 w-4' />
              Download image
            </button>
          </div>
        )}
      </div>
    )
  }

  // For all other cases, show simple JSON
  if (typeof data !== 'object') {
    const stringValue = JSON.stringify(data)
    return (
      <span
        onContextMenu={handleContextMenu}
        className='relative max-w-full overflow-hidden break-all font-[380] font-mono text-muted-foreground leading-normal'
      >
        {typeof data === 'string' ? (
          <TruncatedValue value={stringValue} />
        ) : (
          <span className='break-all font-[380] text-muted-foreground leading-normal'>
            {stringValue}
          </span>
        )}
        {contextMenuPosition && (
          <div
            className='fixed z-50 min-w-[160px] rounded-md border bg-popover py-1 shadow-md'
            style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
          >
            <button
              className='w-full px-3 py-1.5 text-left font-[380] text-sm hover:bg-accent'
              onClick={() => copyToClipboard(data)}
            >
              Copy value
            </button>
          </div>
        )}
      </span>
    )
  }

  // Default case: show JSON as formatted text with collapsible functionality
  return (
    <div onContextMenu={handleContextMenu}>
      <pre className='max-w-full overflow-hidden whitespace-pre-wrap break-all font-mono'>
        <CollapsibleJSON data={data} />
      </pre>
      {contextMenuPosition && (
        <div
          className='fixed z-50 min-w-[160px] rounded-md border bg-popover py-1 shadow-md'
          style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
        >
          <button
            className='w-full px-3 py-1.5 text-left font-[380] text-sm hover:bg-accent'
            onClick={() => copyToClipboard(data)}
          >
            Copy object
          </button>
        </div>
      )}
    </div>
  )
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { logger } from '@sentry/nextjs'
import { File, Folder, Plus } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useFolderStore } from '@/stores/folders/store'

interface CreateMenuProps {
  onCreateWorkflow: (folderId?: string) => Promise<string>
  isCollapsed?: boolean
  isCreatingWorkflow?: boolean
}

export function CreateMenu({
  onCreateWorkflow,
  isCollapsed,
  isCreatingWorkflow = false,
}: CreateMenuProps) {
  const [showFolderDialog, setShowFolderDialog] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null)

  const timeoutRef = useRef<number | null>(null)

  const params = useParams()
  const router = useRouter()
  const workspaceId = params.workspaceId as string
  const { createFolder } = useFolderStore()

  const clearTimeout = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const handleCreateWorkflow = useCallback(async () => {
    if (isCreatingWorkflow) {
      logger.info('Workflow creation already in progress, ignoring request')
      return
    }

    setIsOpen(false)
    clearTimeout()

    try {
      // Call the parent's workflow creation function and wait for the ID
      const workflowId = await onCreateWorkflow()

      // Navigate to the new workflow
      if (workflowId) {
        router.push(`/workspace/${workspaceId}/w/${workflowId}`)
      }
    } catch (error) {
      logger.error('Error creating workflow:', { error })
    }
  }, [onCreateWorkflow, clearTimeout, isCreatingWorkflow, router, workspaceId])

  const handleCreateFolder = useCallback(() => {
    setIsOpen(false)
    clearTimeout()
    setShowFolderDialog(true)
  }, [clearTimeout])

  const handleMouseEnter = useCallback(() => {
    clearTimeout()
    setIsOpen(true)
  }, [clearTimeout])

  const handleMouseLeave = useCallback(() => {
    clearTimeout()
    timeoutRef.current = window.setTimeout(() => {
      setIsOpen(false)
    }, 150)
  }, [clearTimeout])

  // Handle direct click for workflow creation
  const handleButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      // Clear any existing press timer
      if (pressTimer) {
        window.clearTimeout(pressTimer)
        setPressTimer(null)
      }

      // Direct workflow creation on click
      handleCreateWorkflow()
    },
    [handleCreateWorkflow, pressTimer]
  )

  // Handle right-click to show popover
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen(true)
  }, [])

  // Handle long press to show popover
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      // Left mouse button
      const timer = setTimeout(() => {
        setIsOpen(true)
        setPressTimer(null)
      }, 500) // 500ms for long press
      setPressTimer(timer)
    }
  }, [])

  const handleMouseUp = useCallback(() => {
    if (pressTimer) {
      window.clearTimeout(pressTimer)
      setPressTimer(null)
    }
  }, [pressTimer])

  useEffect(() => {
    return () => {
      clearTimeout()
      if (pressTimer) {
        window.clearTimeout(pressTimer)
      }
    }
  }, [clearTimeout, pressTimer])

  const handleFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!folderName.trim() || !workspaceId) return

    setIsCreating(true)
    try {
      await createFolder({
        name: folderName.trim(),
        workspaceId: workspaceId,
      })
      setFolderName('')
      setShowFolderDialog(false)
    } catch (error) {
      logger.error('Failed to create folder:', { error })
    } finally {
      setIsCreating(false)
    }
  }

  const handleCancel = () => {
    setFolderName('')
    setShowFolderDialog(false)
  }

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            className='h-9 w-9 shrink-0 rounded-lg border bg-card shadow-xs hover:bg-accent focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0'
            title='Create Workflow (Right-click or long press for more options)'
            disabled={isCreatingWorkflow}
            onClick={handleButtonClick}
            onContextMenu={handleContextMenu}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              handleMouseUp()
              handleMouseLeave()
            }}
            onMouseEnter={handleMouseEnter}
          >
            <Plus className='h-[18px] w-[18px] stroke-[2px]' />
            <span className='sr-only'>Create Workflow</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align={isCollapsed ? 'center' : 'end'}
          side={isCollapsed ? 'right' : undefined}
          sideOffset={4}
          className='w-40 rounded-lg border-[#E5E5E5] bg-[#FFFFFF] p-1 shadow-xs dark:border-[#414141] dark:bg-[#202020]'
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <button
            className={cn(
              'flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 font-[380] text-card-foreground text-sm outline-none hover:bg-secondary/50 focus:bg-secondary/50',
              isCreatingWorkflow && 'cursor-not-allowed opacity-50'
            )}
            onClick={handleCreateWorkflow}
            disabled={isCreatingWorkflow}
          >
            <File className='h-4 w-4' />
            {isCreatingWorkflow ? 'Creating...' : 'New workflow'}
          </button>
          <button
            className='flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 font-[380] text-card-foreground text-sm outline-none hover:bg-secondary/50 focus:bg-secondary/50'
            onClick={handleCreateFolder}
          >
            <Folder className='h-4 w-4' />
            New folder
          </button>
        </PopoverContent>
      </Popover>

      {/* Folder creation dialog */}
      <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFolderSubmit} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='folder-name'>Folder Name</Label>
              <Input
                id='folder-name'
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder='Enter folder name...'
                autoFocus
                required
              />
            </div>
            <div className='flex justify-end space-x-2'>
              <Button type='button' variant='outline' onClick={handleCancel}>
                Cancel
              </Button>
              <Button type='submit' disabled={!folderName.trim() || isCreating}>
                {isCreating ? 'Creating...' : 'Create Folder'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

'use client'

import { Bug, Copy, Layers, Play, Rocket, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSidebarStore } from '@/stores/sidebar/store'

const SkeletonControlBar = () => {
  return (
    <div className='fixed top-4 right-4 z-20 flex items-center gap-1'>
      {/* Delete Button */}
      <div className='inline-flex h-12 w-12 cursor-not-allowed items-center justify-center gap-2 whitespace-nowrap rounded-[11px] border border-[#E5E5E5] bg-[#FDFDFD] font-medium text-sm opacity-50 ring-offset-background transition-colors [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0'>
        <Trash2 className='h-5 w-5' />
      </div>

      {/* Duplicate Button */}
      <div className='inline-flex h-12 w-12 cursor-not-allowed items-center justify-center gap-2 whitespace-nowrap rounded-[11px] border border-[#E5E5E5] bg-[#FDFDFD] font-medium text-sm opacity-50 ring-offset-background transition-colors [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0'>
        <Copy className='h-5 w-5' />
      </div>

      {/* Auto Layout Button */}
      <div className='inline-flex h-12 w-12 cursor-not-allowed items-center justify-center gap-2 whitespace-nowrap rounded-[11px] border border-[#E5E5E5] bg-[#FDFDFD] font-medium text-sm opacity-50 ring-offset-background transition-colors [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0'>
        <Layers className='h-5 w-5' />
      </div>

      {/* Debug Mode Button */}
      <div className='inline-flex h-12 w-12 cursor-not-allowed items-center justify-center gap-2 whitespace-nowrap rounded-[11px] border border-[#E5E5E5] bg-[#FDFDFD] font-medium text-sm opacity-50 ring-offset-background transition-colors [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0'>
        <Bug className='h-5 w-5' />
      </div>

      {/* Deploy Button */}
      <div className='inline-flex h-12 w-12 cursor-not-allowed items-center justify-center gap-2 whitespace-nowrap rounded-[11px] border border-[#E5E5E5] bg-[#FDFDFD] font-medium text-sm opacity-50 ring-offset-background transition-colors [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0'>
        <Rocket className='h-5 w-5' />
      </div>

      {/* Run Button */}
      <div className='gap-2 font-medium bg-[#701FFC] text-white h-12 rounded-[11px] px-4 py-2 opacity-50 cursor-not-allowed inline-flex items-center justify-center'>
        <Play className='h-3.5 w-3.5 fill-current stroke-current' />
      </div>
    </div>
  )
}

const SkeletonPanelComponent = () => {
  return (
    <div className='fixed top-0 right-0 z-10'>
      {/* Panel skeleton */}
      <div className='h-96 w-80 space-y-4 rounded-bl-lg border-b border-l bg-background p-4'>
        {/* Tab headers skeleton */}
        <div className='flex gap-2 border-b pb-2'>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className='h-6 w-16' />
          ))}
        </div>

        {/* Content skeleton */}
        <div className='space-y-3'>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className='h-4' style={{ width: `${Math.random() * 40 + 60}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

const SkeletonNodes = () => {
  return [
    // Starter node skeleton
    {
      id: 'skeleton-starter',
      type: 'workflowBlock',
      position: { x: 100, y: 100 },
      data: {
        type: 'skeleton',
        config: { name: '', description: '', bgColor: '#9CA3AF' },
        name: '',
        isActive: false,
        isPending: false,
        isSkeleton: true,
      },
      dragHandle: '.workflow-drag-handle',
    },
    // Additional skeleton nodes
    {
      id: 'skeleton-node-1',
      type: 'workflowBlock',
      position: { x: 500, y: 100 },
      data: {
        type: 'skeleton',
        config: { name: '', description: '', bgColor: '#9CA3AF' },
        name: '',
        isActive: false,
        isPending: false,
        isSkeleton: true,
      },
      dragHandle: '.workflow-drag-handle',
    },
    {
      id: 'skeleton-node-2',
      type: 'workflowBlock',
      position: { x: 300, y: 300 },
      data: {
        type: 'skeleton',
        config: { name: '', description: '', bgColor: '#9CA3AF' },
        name: '',
        isActive: false,
        isPending: false,
        isSkeleton: true,
      },
      dragHandle: '.workflow-drag-handle',
    },
  ]
}

interface SkeletonLoadingProps {
  showSkeleton: boolean
  isSidebarCollapsed: boolean
  children: React.ReactNode
}

export function SkeletonLoading({
  showSkeleton,
  isSidebarCollapsed,
  children,
}: SkeletonLoadingProps) {
  const { mode, isExpanded } = useSidebarStore()

  return (
    <div className='flex h-screen w-full flex-col overflow-hidden'>
      {/* Skeleton Control Bar */}
      <div
        className={`transition-opacity duration-500 ${showSkeleton ? 'opacity-100' : 'pointer-events-none absolute opacity-0'}`}
        style={{ zIndex: showSkeleton ? 10 : -1 }}
      >
        <SkeletonControlBar />
      </div>

      {/* Real Control Bar */}
      <div
        className={`transition-opacity duration-500 ${showSkeleton ? 'pointer-events-none absolute opacity-0' : 'opacity-100'}`}
        style={{ zIndex: showSkeleton ? -1 : 10 }}
      >
        {children}
      </div>

      {/* Real content will be rendered by children - sidebar will show its own loading state */}
    </div>
  )
}

export function SkeletonPanelWrapper({ showSkeleton }: { showSkeleton: boolean }) {
  return (
    <div
      className={`transition-opacity duration-500 ${showSkeleton ? 'opacity-100' : 'pointer-events-none absolute opacity-0'}`}
      style={{ zIndex: showSkeleton ? 10 : -1 }}
    >
      <SkeletonPanelComponent />
    </div>
  )
}

export { SkeletonNodes, SkeletonPanelComponent }

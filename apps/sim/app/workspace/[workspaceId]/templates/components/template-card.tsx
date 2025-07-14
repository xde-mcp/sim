import { User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TemplateCardProps {
  id: string
  title: string
  description: string
  author: string
  usageCount: string
  icon?: React.ReactNode
  iconColor?: string
  blocks?: string[]
  onClick?: () => void
  className?: string
}

export function TemplateCard({
  id,
  title,
  description,
  author,
  usageCount,
  icon,
  iconColor = 'bg-blue-500',
  blocks = [],
  onClick,
  className,
}: TemplateCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group cursor-pointer rounded-[14px] border bg-card shadow-xs transition-all duration-200 hover:border-border/80 hover:shadow-sm',
        'flex h-40',
        className
      )}
    >
      {/* Left side - Info */}
      <div className='flex min-w-0 flex-1 flex-col justify-between p-4'>
        {/* Top section */}
        <div className='space-y-3'>
          <div className='flex min-w-0 items-center gap-2.5'>
            {/* Icon container */}
            <div
              className={cn(
                'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded',
                iconColor
              )}
            >
              {icon && <div className='h-3 w-3 text-white [&>svg]:h-3 [&>svg]:w-3'>{icon}</div>}
            </div>
            {/* Template name */}
            <h3 className='truncate font-medium font-sans text-card-foreground text-sm leading-tight'>
              {title}
            </h3>
          </div>

          {/* Description */}
          <p className='line-clamp-3 break-words font-sans text-muted-foreground text-xs leading-relaxed'>
            {description}
          </p>
        </div>

        {/* Bottom section */}
        <div className='flex min-w-0 items-center gap-1.5 font-sans text-muted-foreground text-xs'>
          <span className='flex-shrink-0 truncate'>by</span>
          <span className='truncate'>{author}</span>
          <span className='flex-shrink-0'>•</span>
          <User className='h-3 w-3 flex-shrink-0' />
          <span className='truncate'>{usageCount}</span>
        </div>
      </div>

      {/* Right side - Blocks */}
      <div className='flex w-20 flex-col gap-1 rounded-r-[14px] bg-secondary p-2'>
        {blocks.slice(0, 4).map((block, index) => (
          <div key={index} className='truncate font-sans text-muted-foreground text-xs'>
            {block}
          </div>
        ))}
        {blocks.length > 4 && (
          <div className='font-sans text-muted-foreground text-xs'>+{blocks.length - 4}</div>
        )}
      </div>
    </div>
  )
}

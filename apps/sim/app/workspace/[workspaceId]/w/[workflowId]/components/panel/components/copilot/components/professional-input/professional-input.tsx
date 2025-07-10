'use client'

import { type FC, type KeyboardEvent, useRef, useState } from 'react'
import { ArrowUp, Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface ProfessionalInputProps {
  onSubmit: (message: string) => void
  disabled?: boolean
  isLoading?: boolean
  placeholder?: string
  className?: string
}

const ProfessionalInput: FC<ProfessionalInputProps> = ({
  onSubmit,
  disabled = false,
  isLoading = false,
  placeholder = 'Ask about Sim Studio documentation...',
  className,
}) => {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    const trimmedMessage = message.trim()
    if (!trimmedMessage || disabled || isLoading) return

    onSubmit(trimmedMessage)
    setMessage('')
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }

  const canSubmit = message.trim().length > 0 && !disabled && !isLoading

  return (
    <div className={cn('border-t bg-background p-4', className)}>
      <div className="mx-auto max-w-4xl">
        <div className="relative">
          <div className="relative flex items-end rounded-2xl border border-border bg-background shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || isLoading}
              className="min-h-[50px] max-h-[120px] resize-none border-0 bg-transparent px-4 py-3 pr-12 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
              rows={1}
            />
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              size="icon"
              className={cn(
                "absolute bottom-2 right-2 h-8 w-8 rounded-xl transition-all",
                canSubmit 
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" 
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {/* Helper text */}
          <div className="mt-2 px-1">
            <p className="text-xs text-muted-foreground">
              Press Enter to send, Shift + Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export { ProfessionalInput } 
'use client'

import { type FC, memo } from 'react'
import { Bot, Copy, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkGfm from 'remark-gfm'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CopilotMessage } from '@/stores/copilot/types'

interface ProfessionalMessageProps {
  message: CopilotMessage
  isStreaming?: boolean
}

const ProfessionalMessage: FC<ProfessionalMessageProps> = memo(({ message, isStreaming }) => {
  const { theme } = useTheme()
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  const handleCopyContent = () => {
    navigator.clipboard.writeText(message.content)
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Custom components for react-markdown
  const markdownComponents = {
    code: ({ inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '')
      const language = match ? match[1] : ''
      
      if (!inline && language) {
        return (
          <div className="relative group">
            <SyntaxHighlighter
              style={theme === 'dark' ? oneDark : oneLight}
              language={language}
              PreTag="div"
              className="!mt-2 !mb-2 rounded-lg !bg-muted/50"
              showLineNumbers={language !== 'bash' && language !== 'shell'}
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
              onClick={() => navigator.clipboard.writeText(String(children))}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        )
      }

      return (
        <code 
          className="bg-muted/80 px-1.5 py-0.5 rounded text-sm font-mono border"
          {...props}
        >
          {children}
        </code>
      )
    },
    pre: ({ children }: any) => (
      <div className="my-3 overflow-hidden rounded-lg border bg-muted/30">
        {children}
      </div>
    ),
    h1: ({ children }: any) => (
      <h1 className="text-xl font-bold mt-6 mb-3 text-foreground border-b pb-2">
        {children}
      </h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-lg font-semibold mt-5 mb-2 text-foreground">
        {children}
      </h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-base font-semibold mt-4 mb-2 text-foreground">
        {children}
      </h3>
    ),
    p: ({ children }: any) => (
      <p className="text-sm leading-relaxed text-foreground mb-3 last:mb-0">
        {children}
      </p>
    ),
    a: ({ href, children }: any) => (
      <a 
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium underline underline-offset-2 decoration-blue-600/30 hover:decoration-blue-600/60 transition-colors"
      >
        {children}
      </a>
    ),
    ul: ({ children }: any) => (
      <ul className="space-y-1 ml-4 mb-3 list-disc list-outside">
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className="space-y-1 ml-4 mb-3 list-decimal list-outside">
        {children}
      </ol>
    ),
    li: ({ children }: any) => (
      <li className="text-sm text-foreground leading-relaxed">
        {children}
      </li>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-muted-foreground/20 pl-4 py-2 my-3 bg-muted/30 rounded-r-lg italic text-muted-foreground">
        {children}
      </blockquote>
    ),
    table: ({ children }: any) => (
      <div className="my-3 overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          {children}
        </table>
      </div>
    ),
    th: ({ children }: any) => (
      <th className="border-b bg-muted/50 px-3 py-2 text-left font-semibold">
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="border-b border-muted/30 px-3 py-2">
        {children}
      </td>
    ),
  }

  if (isUser) {
    return (
      <div className="group flex justify-end px-4 py-3">
        <div className="flex items-start gap-3 max-w-[85%]">
          <div className="flex flex-col items-end space-y-1">
            <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-3 shadow-sm">
              <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {message.content}
              </div>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs text-muted-foreground">
                {formatTimestamp(message.timestamp)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyContent}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <User className="h-4 w-4" />
          </div>
        </div>
      </div>
    )
  }

  if (isAssistant) {
    return (
      <div className="group flex justify-start px-4 py-3">
        <div className="flex items-start gap-3 max-w-[85%]">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-sm">
            <Bot className="h-4 w-4" />
          </div>
          <div className="flex flex-col items-start space-y-1 min-w-0 flex-1">
            <div className="bg-muted/50 border rounded-2xl rounded-tl-md px-4 py-3 shadow-sm w-full">
              {message.content ? (
                                 <div className="prose prose-sm dark:prose-invert max-w-none">
                   <ReactMarkdown
                     remarkPlugins={[remarkGfm]}
                     components={markdownComponents}
                   >
                     {message.content}
                   </ReactMarkdown>
                 </div>
              ) : isStreaming ? (
                <div className="flex items-center gap-2 text-muted-foreground py-1">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm">Thinking...</span>
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs text-muted-foreground">
                {formatTimestamp(message.timestamp)}
              </span>
              {message.content && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyContent}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            {/* Citations if available */}
            {message.citations && message.citations.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="text-xs text-muted-foreground font-medium">Sources:</div>
                <div className="flex flex-wrap gap-1">
                  {message.citations.map((citation) => (
                    <a
                      key={citation.id}
                      href={citation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-2 py-1 rounded-md bg-muted/50 hover:bg-muted border text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {citation.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
})

ProfessionalMessage.displayName = 'ProfessionalMessage'

export { ProfessionalMessage } 
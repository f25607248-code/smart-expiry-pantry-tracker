import { useEffect, useRef, useState } from 'react'
import { Bot, Send, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { InsightCard } from './InsightCard'
import { getInsights, askAssistant } from '@/lib/api/assistant'
import { getApiErrorMessage } from '@/lib/axios'
import type { Insight } from '@/types'

type ChatMessage = { role: 'user' | 'assistant'; text: string }

export function AssistantPanel() {
  const [open, setOpen] = useState(false)
  const [insights, setInsights] = useState<Insight[]>([])
  const [isLoadingInsights, setIsLoadingInsights] = useState(true)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: "Hi! I'm your pantry assistant. Ask me what's expiring, what to cook, or check the tips below." },
  ])
  const [question, setQuestion] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setIsLoadingInsights(true)
    getInsights()
      .then(setInsights)
      .catch((error) => toast.error(getApiErrorMessage(error, 'Could not load assistant insights')))
      .finally(() => setIsLoadingInsights(false))
  }, [open])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function handleAsk() {
    const text = question.trim()
    if (!text || isAsking) return

    setMessages((prev) => [...prev, { role: 'user', text }])
    setQuestion('')
    setIsAsking(true)
    try {
      const reply = await askAssistant(text)
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }])
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', text: getApiErrorMessage(error, "Sorry, I couldn't answer that right now.") }])
    } finally {
      setIsAsking(false)
    }
  }

  const urgentCount = insights.filter((i) => i.severity === 'urgent').length

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full p-0 shadow-lg"
        aria-label="Open pantry assistant"
      >
        <Bot className="size-5" />
        {urgentCount > 0 && (
          <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
            {urgentCount}
          </span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> Pantry Assistant
            </SheetTitle>
            <SheetDescription>Expiry alerts, waste insights, and buying suggestions.</SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
            {isLoadingInsights ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : insights.length === 0 ? (
              <p className="text-sm text-muted-foreground">No insights yet — add a few pantry items to get started.</p>
            ) : (
              insights.map((insight) => <InsightCard key={insight.id} insight={insight} />)
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <div ref={scrollRef} className="flex max-h-48 flex-col gap-2 overflow-y-auto">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === 'user'
                      ? 'ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground'
                      : 'mr-auto max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm'
                  }
                >
                  {m.text}
                </div>
              ))}
              {isAsking && <div className="mr-auto max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Thinking…</div>}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Ask what's expiring or what to cook…"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                disabled={isAsking}
              />
              <Button size="icon" onClick={handleAsk} disabled={isAsking || !question.trim()} aria-label="Send">
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

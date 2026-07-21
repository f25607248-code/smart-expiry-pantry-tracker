import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { parseVoiceCommand } from '@/lib/voiceParser'

type Props = {
  onParsed: (result: { name: string; quantity: number; unit: string }) => void
}

/** Speech-to-text quick add using the browser's native Web Speech API - no API key or install required. */
export function VoiceQuickAddButton({ onParsed }: Props) {
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  function start() {
    const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SpeechRecognitionCtor) {
      toast.error('Voice input needs a browser that supports speech recognition (try Chrome or Edge).')
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      toast.message(`Heard: "${transcript}"`)
      onParsed(parseVoiceCommand(transcript))
    }
    recognition.onerror = () => {
      toast.error('Could not understand that — try again or add the item manually.')
      setIsListening(false)
    }
    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  function stop() {
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  return (
    <Button variant={isListening ? 'default' : 'outline'} onClick={isListening ? stop : start} title='Try: "add two cartons of milk"'>
      {isListening ? <MicOff className="mr-1 size-4" /> : <Mic className="mr-1 size-4" />}
      {isListening ? 'Listening…' : 'Voice add'}
    </Button>
  )
}

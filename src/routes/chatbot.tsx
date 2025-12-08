import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card } from '@/components/ui/card'
import { pipeline, env, TextGenerationPipeline } from '@huggingface/transformers'
import { toast } from 'sonner'

export const Route = createFileRoute('/chatbot')({
  component: Chatbot,
})

interface Message {
  role: 'user' | 'assistant'
  content: string
}

function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [useWebGPU, setUseWebGPU] = useState(true)
  const [webGPUSupported, setWebGPUSupported] = useState<boolean | null>(null)
  const [modelLoaded, setModelLoaded] = useState(false)
  const pipelineRef = useRef<TextGenerationPipeline | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Check WebGPU support on mount
  useEffect(() => {
    const checkWebGPU = async () => {
      if ('gpu' in navigator) {
        try {
          // Type assertion for WebGPU API which isn't in standard Navigator type yet
          const adapter = await (navigator as Navigator & { gpu: GPU }).gpu.requestAdapter()
          setWebGPUSupported(!!adapter)
          if (!adapter) {
            toast.warning('WebGPU adapter not available, using CPU')
            setUseWebGPU(false)
          }
        } catch (error) {
          console.error('WebGPU check failed:', error)
          setWebGPUSupported(false)
          setUseWebGPU(false)
          toast.warning('WebGPU not supported, using CPU')
        }
      } else {
        setWebGPUSupported(false)
        setUseWebGPU(false)
        toast.warning('WebGPU not supported in this browser, using CPU')
      }
    }
    checkWebGPU()
  }, [])

  // Initialize model when device changes or on first load
  const initializeModel = async (device: 'webgpu' | 'wasm') => {
    if (pipelineRef.current) {
      pipelineRef.current = null
      setModelLoaded(false)
    }

    setIsInitializing(true)
    try {
      toast.info(`Initializing model with ${device === 'webgpu' ? 'WebGPU' : 'CPU'}...`)
      
      // Use a smaller model for better browser performance
      // Qwen2.5-0.5B is a good lightweight option
      const model = 'onnx-community/Qwen2.5-0.5B-Instruct'
      
      pipelineRef.current = await pipeline(
        'text-generation',
        model,
        { 
          device,
          dtype: 'fp32',
        }
      )
      
      setModelLoaded(true)
      toast.success(`Model loaded successfully using ${device === 'webgpu' ? 'WebGPU' : 'CPU'}!`)
    } catch (error) {
      console.error('Failed to load model:', error)
      
      // Provide more helpful error message
      let errorMessage = 'Unknown error'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (typeof error === 'number') {
        errorMessage = `Error code: ${error}. This may be due to corrupted cache or network issues. Try clearing browser cache or reloading.`
      } else if (error && typeof error === 'object') {
        // Try to extract any useful error information
        errorMessage = JSON.stringify(error).substring(0, 200)
      }
      
      toast.error(`Failed to load model: ${errorMessage}`, {
        duration: 10000, // Show error for 10 seconds
      })
      setModelLoaded(false)
    } finally {
      setIsInitializing(false)
    }
  }

  // Handle WebGPU toggle
  const handleDeviceToggle = (checked: boolean) => {
    if (!webGPUSupported && checked) {
      toast.error('WebGPU is not supported in your browser')
      return
    }
    setUseWebGPU(checked)
    setModelLoaded(false)
    pipelineRef.current = null
  }

  // Load model button handler
  const handleLoadModel = () => {
    const device = useWebGPU ? 'webgpu' : 'wasm'
    initializeModel(device)
  }

  // Send message
  const handleSend = async () => {
    if (!input.trim() || !modelLoaded || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Build conversation context
      const conversationContext = messages
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n')
      
      const prompt = conversationContext 
        ? `${conversationContext}\nUser: ${userMessage.content}\nAssistant:`
        : `User: ${userMessage.content}\nAssistant:`

      const output = await pipelineRef.current(prompt, {
        max_new_tokens: 100,
        do_sample: true,
        temperature: 0.7,
        top_k: 50,
        top_p: 0.9,
      })

      let responseText = output[0].generated_text
      
      // Extract only the assistant's response
      if (responseText.includes('Assistant:')) {
        const parts = responseText.split('Assistant:')
        responseText = parts[parts.length - 1].trim()
      }
      
      // Remove the prompt from the response if it's included
      if (responseText.startsWith(prompt)) {
        responseText = responseText.slice(prompt.length).trim()
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: responseText || 'I apologize, but I could not generate a response.',
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error generating response:', error)
      toast.error('Failed to generate response')
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error while generating a response.',
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">AI Chatbot</h1>
        <p className="text-muted-foreground">
          Chat with a lightweight LLM running locally in your browser
        </p>
      </div>

      {/* Model Configuration */}
      <Card className="p-6 mb-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="webgpu-toggle" className="text-base font-medium">
                Use WebGPU Acceleration
              </Label>
              <p className="text-sm text-muted-foreground">
                {webGPUSupported === null
                  ? 'Checking WebGPU support...'
                  : webGPUSupported
                  ? 'WebGPU is supported (much faster)'
                  : 'WebGPU not supported, using CPU'}
              </p>
            </div>
            <Switch
              id="webgpu-toggle"
              checked={useWebGPU}
              onCheckedChange={handleDeviceToggle}
              disabled={!webGPUSupported || modelLoaded || isInitializing}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleLoadModel}
              disabled={isInitializing || modelLoaded}
              className="flex-1"
            >
              {isInitializing
                ? 'Loading Model...'
                : modelLoaded
                ? 'Model Loaded ✓'
                : 'Load Model'}
            </Button>
            {modelLoaded && (
              <Button
                onClick={() => {
                  setModelLoaded(false)
                  pipelineRef.current = null
                  setMessages([])
                  toast.info('Model unloaded')
                }}
                variant="outline"
              >
                Unload
              </Button>
            )}
          </div>

          {isInitializing && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This may take a minute on first load as the model is downloaded...
              </p>
              <p className="text-xs text-muted-foreground">
                If loading fails, try refreshing the page or clearing your browser cache.
              </p>
            </div>
          )}

          {modelLoaded && (
            <p className="text-sm text-green-600 dark:text-green-400">
              Model ready! Using {useWebGPU ? 'WebGPU' : 'CPU'} for inference.
            </p>
          )}
        </div>
      </Card>

      {/* Chat Messages */}
      <Card className="p-4 mb-4 h-[500px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center space-y-2">
              <p>No messages yet</p>
              <p className="text-sm">Load the model and start chatting!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm font-medium mb-1">
                    {message.role === 'user' ? 'You' : 'Assistant'}
                  </p>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted">
                  <p className="text-sm font-medium mb-1">Assistant</p>
                  <p className="animate-pulse">Thinking...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </Card>

      {/* Input Area */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={
            !modelLoaded
              ? 'Load the model first...'
              : 'Type your message...'
          }
          disabled={!modelLoaded || isLoading}
          className="flex-1 px-4 py-2 rounded-md border border-input bg-background"
        />
        <Button
          onClick={handleSend}
          disabled={!modelLoaded || isLoading || !input.trim()}
        >
          Send
        </Button>
      </div>
    </div>
  )
}

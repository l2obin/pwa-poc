import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { pipeline, TextGenerationPipeline } from '@huggingface/transformers'
import { toast } from 'sonner'

export const Route = createFileRoute('/chatbot')({
  component: Chatbot,
})

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// Top 5 popular lightweight LLM models for browser use
const AVAILABLE_MODELS = [
  {
    id: 'Xenova/distilgpt2',
    name: 'DistilGPT2',
    description: 'Fast and lightweight (~80MB)',
    size: '~80MB'
  },
  {
    id: 'Xenova/gpt2',
    name: 'GPT-2',
    description: 'Good quality, moderate size (~500MB)',
    size: '~500MB'
  },
  {
    id: 'Xenova/LaMini-Flan-T5-783M',
    name: 'LaMini-Flan-T5',
    description: 'Instruction-tuned, good reasoning (~783MB)',
    size: '~783MB'
  },
  {
    id: 'Xenova/TinyLlama-1.1B-Chat-v1.0',
    name: 'TinyLlama Chat',
    description: 'Small Llama variant (~600MB)',
    size: '~600MB'
  },
  {
    id: 'onnx-community/Qwen2.5-0.5B-Instruct',
    name: 'Qwen2.5-0.5B',
    description: 'Compact instruct model (~200MB)',
    size: '~200MB'
  }
] as const

function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [useWebGPU, setUseWebGPU] = useState(true)
  const [webGPUSupported, setWebGPUSupported] = useState<boolean | null>(null)
  const [modelLoaded, setModelLoaded] = useState(false)
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id)
  const pipelineRef = useRef<TextGenerationPipeline | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Check WebGPU support on mount
  useEffect(() => {
    console.log('[Chatbot] Component mounted')
    console.log('[Chatbot] Navigator info:', {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      hasGPU: 'gpu' in navigator
    })
    
    const checkWebGPU = async () => {
      console.log('[Chatbot] Checking WebGPU support...')
      if ('gpu' in navigator) {
        try {
          // Type assertion for WebGPU API which isn't in standard Navigator type yet
          const adapter = await (navigator as Navigator & { gpu: GPU }).gpu.requestAdapter()
          console.log('[Chatbot] WebGPU adapter:', adapter ? 'Available' : 'Not available')
          setWebGPUSupported(!!adapter)
          if (!adapter) {
            console.log('[Chatbot] WebGPU adapter not available, falling back to CPU')
            toast.warning('WebGPU adapter not available, using CPU')
            setUseWebGPU(false)
          } else {
            console.log('[Chatbot] WebGPU is supported and available')
          }
        } catch (error) {
          console.error('[Chatbot] WebGPU check failed:', error)
          setWebGPUSupported(false)
          setUseWebGPU(false)
          toast.warning('WebGPU not supported, using CPU')
        }
      } else {
        console.log('[Chatbot] WebGPU API not found in navigator')
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
      console.log('[Chatbot] Cleaning up previous model instance')
      pipelineRef.current = null
      setModelLoaded(false)
    }

    setIsInitializing(true)
    console.log(`[Chatbot] Starting model initialization with device: ${device}`)
    
    try {
      toast.info(`Initializing ${AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name} with ${device === 'webgpu' ? 'WebGPU' : 'CPU'}...`)
      
      const modelInfo = AVAILABLE_MODELS.find(m => m.id === selectedModel)
      const model = selectedModel
      
      console.log(`[Chatbot] Loading model: ${model}`)
      console.log(`[Chatbot] Model info:`, modelInfo)
      console.log(`[Chatbot] Device: ${device}, dtype: fp32`)
      console.log('[Chatbot] Starting pipeline creation...')
      
      const startTime = Date.now()
      pipelineRef.current = await pipeline(
        'text-generation',
        model,
        { 
          device,
          dtype: 'fp32',
        }
      )
      const loadTime = Date.now() - startTime
      
      console.log(`[Chatbot] Model loaded successfully in ${loadTime}ms`)
      console.log('[Chatbot] Pipeline details:', {
        model,
        device,
        loadTime,
        timestamp: new Date().toISOString()
      })
      
      setModelLoaded(true)
      toast.success(`Model loaded successfully in ${(loadTime / 1000).toFixed(1)}s using ${device === 'webgpu' ? 'WebGPU' : 'CPU'}!`)
    } catch (error) {
      console.error('[Chatbot] Failed to load model')
      console.error('[Chatbot] Error type:', typeof error)
      console.error('[Chatbot] Error details:', error)
      
      // Log stack trace if available
      if (error instanceof Error && error.stack) {
        console.error('[Chatbot] Stack trace:', error.stack)
      }
      
      // Provide more helpful error message
      let errorMessage = 'Unknown error'
      if (error instanceof Error) {
        errorMessage = error.message
        console.error('[Chatbot] Error message:', errorMessage)
      } else if (typeof error === 'string') {
        errorMessage = error
        console.error('[Chatbot] String error:', errorMessage)
      } else if (typeof error === 'number') {
        errorMessage = `Error code: ${error}. This may be due to corrupted cache or network issues. Try clearing browser cache or reloading.`
        console.error('[Chatbot] Numeric error code:', error)
      } else if (error && typeof error === 'object') {
        console.error('[Chatbot] Object error, attempting to serialize...')
        // Try to extract any useful error information, handling potential circular references
        try {
          const serialized = JSON.stringify(error)
          console.error('[Chatbot] Serialized error:', serialized)
          errorMessage = serialized.substring(0, 200)
          if (serialized.length > 200) {
            errorMessage += '...'
          }
        } catch {
          // If stringify fails (e.g., circular reference), fall back to toString
          errorMessage = `Error object: ${String(error)}`
          console.error('[Chatbot] Could not serialize, using toString:', errorMessage)
        }
      }
      
      console.error('[Chatbot] Final error message for user:', errorMessage)
      
      toast.error(`Failed to load model: ${errorMessage}`, {
        duration: 10000, // Show error for 10 seconds
      })
      setModelLoaded(false)
    } finally {
      setIsInitializing(false)
      console.log('[Chatbot] Model initialization completed')
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

  // Handle model selection change
  const handleModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = event.target.value
    console.log('[Chatbot] Model selection changed:', newModel)
    setSelectedModel(newModel)
    
    // If a model is currently loaded, unload it
    if (modelLoaded) {
      console.log('[Chatbot] Unloading current model due to selection change')
      setModelLoaded(false)
      pipelineRef.current = null
      setMessages([])
      toast.info('Model changed. Please load the new model.')
    }
  }

  // Load model button handler
  const handleLoadModel = () => {
    const device = useWebGPU ? 'webgpu' : 'wasm'
    initializeModel(device)
  }

  // Send message
  const handleSend = async () => {
    if (!input.trim() || !modelLoaded || isLoading) {
      console.log('[Chatbot] Cannot send - conditions not met:', {
        hasInput: !!input.trim(),
        modelLoaded,
        isLoading
      })
      return
    }

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
    }

    console.log('[Chatbot] Sending message:', userMessage.content)
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

      console.log('[Chatbot] Generating response with prompt length:', prompt.length)
      console.log('[Chatbot] Generation parameters:', {
        max_new_tokens: 100,
        do_sample: true,
        temperature: 0.7,
        top_k: 50,
        top_p: 0.9,
      })
      
      const startTime = Date.now()
      const output = await pipelineRef.current(prompt, {
        max_new_tokens: 100,
        do_sample: true,
        temperature: 0.7,
        top_k: 50,
        top_p: 0.9,
      })
      const inferenceTime = Date.now() - startTime
      
      console.log('[Chatbot] Response generated in', inferenceTime, 'ms')
      console.log('[Chatbot] Raw output:', output)

      let responseText = output[0].generated_text
      console.log('[Chatbot] Generated text length:', responseText.length)
      
      // Extract only the assistant's response
      if (responseText.includes('Assistant:')) {
        const parts = responseText.split('Assistant:')
        responseText = parts[parts.length - 1].trim()
        console.log('[Chatbot] Extracted assistant response after split')
      }
      
      // Remove the prompt from the response if it's included
      if (responseText.startsWith(prompt)) {
        responseText = responseText.slice(prompt.length).trim()
        console.log('[Chatbot] Removed prompt from response')
      }

      console.log('[Chatbot] Final response text:', responseText)

      const assistantMessage: Message = {
        role: 'assistant',
        content: responseText || 'I apologize, but I could not generate a response.',
      }

      setMessages(prev => [...prev, assistantMessage])
      console.log('[Chatbot] Message added to conversation')
    } catch (error) {
      console.error('[Chatbot] Error generating response')
      console.error('[Chatbot] Error type:', typeof error)
      console.error('[Chatbot] Error details:', error)
      
      if (error instanceof Error && error.stack) {
        console.error('[Chatbot] Stack trace:', error.stack)
      }
      
      toast.error('Failed to generate response')
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error while generating a response.',
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      console.log('[Chatbot] Message sending completed')
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
          {/* Model Selection Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="model-select" className="text-base font-medium">
              Select Model
            </Label>
            <Select
              id="model-select"
              value={selectedModel}
              onChange={handleModelChange}
              disabled={isInitializing}
              className="w-full"
            >
              {AVAILABLE_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} - {model.description} ({model.size})
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose from top 5 popular lightweight models optimized for browser use
            </p>
          </div>

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

import { Toaster } from 'sonner'
import '@/App.css'
import SqliteConsole from '@/sqlite-test/sqlite-console'
import { ThemeProvider } from '@/components/theme-provider'
import { ModeToggle } from './components/mode-toggle'

function App() {

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <header className="flex items-baseline justify-between p-4 bg-gray-100 dark:bg-gray-800">
        <h1 className="text-xl font-bold">SQLite WASM OPFS Perf Test</h1>
        <ModeToggle />
      </header>
      <SqliteConsole />
      <Toaster />
    </ThemeProvider>
  )
}

export default App

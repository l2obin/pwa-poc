import { Toaster } from 'sonner'
import SqliteConsole from '@/sqlite-test/sqlite-console'
import { ThemeProvider } from '@/components/theme-provider'
import { ModeToggle } from './components/mode-toggle'

function App() {

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <header className="flex items-baseline justify-between p-4 bg-gray-100 dark:bg-gray-900 fixed top-0 left-0 right-0 z-50">
        <h1 className="text-xl font-bold">SQLite WASM OPFS Perf Test</h1>
        <ModeToggle />
      </header>
      <main className="pt-16 px-4">
        <SqliteConsole />
      </main>
      <Toaster />
    </ThemeProvider>
  )
}

export default App

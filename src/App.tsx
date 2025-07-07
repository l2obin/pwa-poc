import { Toaster } from 'sonner'
import './App.css'
import SqliteConsole from './sqlite-test/sqlite-console'

function App() {

  return (
    <div>
      <SqliteConsole />
      <Toaster />
    </div>
  )
}

export default App

import { useState } from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
import SqliteConsole from './sqlite-test/sqlite-console'

function App() {
  const [count, setCount] = useState(0)

  let runFirst = false
  // Run once only for worker
  if (!runFirst) {
    runFirst = true
    // const worker = new Worker('/worker.js', { type: 'module' });
    // worker.onmessage = (e) => {  
    //   e.data.type === 'log' ? console.log(e.data.payload) : console.error(e.data.payload);  
    // };
  }

  return (
    <>
      <div>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>

      <SqliteConsole />
    </>
  )
}

export default App

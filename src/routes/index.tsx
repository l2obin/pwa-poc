import SqliteConsole from '@/sqlite-test/sqlite-console'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <SqliteConsole />
  )
}
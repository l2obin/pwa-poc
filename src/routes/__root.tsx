import { MainNav } from '@/components/main-nav'
import type { NavItem } from '@/types'
import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

const showDevtools = import.meta.env.VITE_TANSTACK_ROUTER_DEVTOOLS === 'true'

const NAV_ITEMS: NavItem[] = [
  {
    title: 'Home',
    href: '/'
  },
  {
    title: 'About',
    href: '/about'
  }
]

export const Route = createRootRoute({
  component: () => (
    <>
      <MainNav items={NAV_ITEMS}/>
      <div className='pt-16 px-2 md:px-4'>
        <Outlet />
      </div>
      {showDevtools && <TanStackRouterDevtools />}
    </>
  ),
})


      // <header className="flex items-baseline justify-between p-4 bg-gray-100 dark:bg-gray-900 fixed top-0 left-0 right-0 z-50">
      //   <h1 className="text-xl font-bold">SQLite WASM OPFS Perf Test</h1>
      //   <ModeToggle />
      // </header>
      // <main className="pt-16 px-4">
      //   <SqliteConsole />
      // </main>
      // <Toaster />
import { MainNav } from '@/components/main-nav'
import type { NavItem } from '@/types'
import { createRootRoute, Outlet } from '@tanstack/react-router'
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
      <div className='mt-18'>
        <Outlet />
      </div>
      {showDevtools && <TanStackRouterDevtools />}
    </>
  ),
})

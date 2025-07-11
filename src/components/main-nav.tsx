import * as React from "react"
import { useNavigate } from '@tanstack/react-router'

import logo from "@/assets/logo.svg"

import type { MainNavItem } from "@/types"
import { siteConfig } from "@/config/site"

import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"


interface MainNavProps {
  items?: MainNavItem[]
  children?: React.ReactNode
}

export function MainNav({ items, children }: MainNavProps) {
  const navigate = useNavigate()
  const segment = window.location.pathname.split("/")[1] || "home"

  return (
    <div className="flex gap-4 md:gap-10 p-2 bg-gray-50 dark:bg-neutral-950 fixed top-0 left-0 right-0 z-50 border-b border-gray-300 dark:border-neutral-700">
      <Button variant="ghost" className="flex items-center space-x-2">
        {/* <LightbulbIcon className="h-6 w-6" /> */}
        <img src={logo} alt="logo" />
        <span className="font-bold">
          {siteConfig.name}
        </span>
      </Button>
      {items?.length ? (
        <nav className="hidden gap-6 md:flex">
          {items?.map((item) => (
            <Button
              variant="link"
              key={item.href}
              onClick={() => navigate({ to: item.href })}
              className={cn(
                "flex items-center text-lg font-medium transition-colors hover:text-foreground/80 sm:text-sm",
                item.href.startsWith(`/${segment}`)
                  ? "text-foreground"
                  : "text-foreground/60",
                item.disabled && "cursor-not-allowed opacity-80"
              )}
            >
              {item.title}
            </Button>
          ))}
        </nav>
      ) : null}
      <div className="flex items-center ml-auto space-x-4">
        <ModeToggle />
      </div>
    </div>
  )
}
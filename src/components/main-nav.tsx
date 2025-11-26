import * as React from "react"
import { useNavigate } from '@tanstack/react-router'
import { Menu } from "lucide-react"

import logo from "@/assets/logo.svg"
import logo_dark  from "@/assets/logo-dark.svg"

import type { MainNavItem } from "@/types"
import { siteConfig } from "@/config/site"

import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


interface MainNavProps {
  items?: MainNavItem[]
}

export function MainNav({ items }: MainNavProps) {
  const navigate = useNavigate()
  const segment = window.location.pathname.split("/")[1] || "home"

  return (
    <div className="flex gap-4 md:gap-10 py-4 px-6 bg-gray-50 dark:bg-neutral-950 fixed top-0 left-0 right-0 z-50 border-b border-gray-300 dark:border-neutral-700">
      <Button variant="link" className="flex items-center gap-2 p-0">
        {/* <LightbulbIcon className="h-6 w-6" /> */}
        <img src={logo} alt="logo" className="inline-block dark:hidden"/>
        <img src={logo_dark} alt="logo dark" className="hidden dark:inline-block" />
        <span className="font-bold">
          {siteConfig.name}
        </span>
      </Button>
      {items?.length ? (
        <>
          {/* Desktop Navigation */}
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
          
          {/* Mobile Navigation - Hamburger Menu */}
          <div className="flex md:hidden ml-auto items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {items?.map((item) => (
                  <DropdownMenuItem
                    key={item.href}
                    onClick={() => navigate({ to: item.href })}
                    disabled={item.disabled}
                    className={cn(
                      "cursor-pointer",
                      item.href.startsWith(`/${segment}`)
                        ? "bg-accent"
                        : ""
                    )}
                  >
                    {item.title}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <ModeToggle />
          </div>
        </>
      ) : null}
      {/* Desktop Theme Toggle */}
      <div className="hidden md:flex items-center ml-auto space-x-4">
        <ModeToggle />
      </div>
    </div>
  )
}

"use client"

import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/layout/sidebar-provider"
import { Button } from "./button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip"
import { PanelLeftClose, PanelRightClose } from "lucide-react"

const Sidebar = React.forwardRef<
  HTMLElement,
  React.ComponentProps<"aside">
>(({ className, onMouseEnter, onMouseLeave, ...props }, ref) => {
  const { isSidebarOpen, isHovered, setIsHovered } = useSidebar()
  const effectiveOpen = isSidebarOpen || isHovered

  return (
    <aside
      ref={ref}
      onMouseEnter={(e) => {
        setIsHovered(true)
        onMouseEnter?.(e)
      }}
      onMouseLeave={(e) => {
        setIsHovered(false)
        onMouseLeave?.(e)
      }}
      className={cn(
        "flex flex-col border-r transition-all duration-300 ease-in-out bg-background z-40",
        effectiveOpen ? "w-64" : "w-0 lg:w-20 opacity-0 lg:opacity-100 pointer-events-none lg:pointer-events-auto border-none lg:border-r",
        className
      )}
      {...props}
    />
  )
})
Sidebar.displayName = "Sidebar"

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { isSidebarOpen, isHovered } = useSidebar()
  const effectiveOpen = isSidebarOpen || isHovered

  return (
    <div
      ref={ref}
      className={cn(
        "flex h-16 items-center border-b px-4 shrink-0 transition-all",
        !effectiveOpen && "justify-center px-0",
        className
      )}
      {...props}
    />
  )
})
SidebarHeader.displayName = "SidebarHeader"

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex-1 overflow-x-hidden overflow-y-auto", className)} {...props} />
))
SidebarContent.displayName = "SidebarContent"

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("mt-auto p-4 border-t", className)}
    {...props}
  />
))
SidebarFooter.displayName = "SidebarFooter"

const SidebarMenu = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <nav ref={ref} className={cn("flex flex-col gap-1", className)} {...props} />
))
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
))
SidebarMenuItem.displayName = "SidebarMenuItem"

const SidebarMenuButton = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentProps<typeof Button> & {
    isActive?: boolean
    tooltip?: string
  }
>(({ className, isActive, tooltip, children, ...props }, ref) => {
  const { isSidebarOpen, isHovered } = useSidebar()
  const effectiveOpen = isSidebarOpen || isHovered

  const buttonContent = (
    <Button
      ref={ref}
      variant={isActive ? "secondary" : "ghost"}
      className={cn(
        "w-full justify-start gap-3 transition-all",
        !effectiveOpen && "justify-center px-2",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  )

  if (!effectiveOpen && tooltip) {
    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
          <TooltipContent side="right" className="ml-2">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return buttonContent
})
SidebarMenuButton.displayName = "SidebarMenuButton"


const SidebarTrigger = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentProps<typeof Button>
>(({ className, ...props }, ref) => {
  const { isSidebarOpen, setIsSidebarOpen } = useSidebar();
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      className={cn("flex", className)}
      {...props}
    >
      {isSidebarOpen ? <PanelLeftClose /> : <PanelRightClose />}
      <span className="sr-only">Toggle sidebar</span>
    </Button>
  )
})
SidebarTrigger.displayName = "SidebarTrigger"


export {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
}

/**
 * HaadyUI DropdownMenu Component
 * 
 * A styled DropdownMenu component with increased rounded corners for the dropdown menu.
 * Wraps shadcn/ui DropdownMenu primitives with Haady brand styling.
 */

"use client"

import * as React from "react"
import {
  DropdownMenu as DropdownMenuPrimitive,
  DropdownMenuCheckboxItem as DropdownMenuCheckboxItemPrimitive,
  DropdownMenuContent as DropdownMenuContentPrimitive,
  DropdownMenuGroup as DropdownMenuGroupPrimitive,
  DropdownMenuItem as DropdownMenuItemPrimitive,
  DropdownMenuLabel as DropdownMenuLabelPrimitive,
  DropdownMenuPortal as DropdownMenuPortalPrimitive,
  DropdownMenuRadioGroup as DropdownMenuRadioGroupPrimitive,
  DropdownMenuRadioItem as DropdownMenuRadioItemPrimitive,
  DropdownMenuSeparator as DropdownMenuSeparatorPrimitive,
  DropdownMenuShortcut as DropdownMenuShortcutPrimitive,
  DropdownMenuSub as DropdownMenuSubPrimitive,
  DropdownMenuSubContent as DropdownMenuSubContentPrimitive,
  DropdownMenuSubTrigger as DropdownMenuSubTriggerPrimitive,
  DropdownMenuTrigger as DropdownMenuTriggerPrimitive,
} from "@/components/ui/dropdown-menu"
import { cn } from "../utils/cn"

/**
 * DropdownMenu Root - Wrapper for the dropdown menu
 */
function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive>) {
  return <DropdownMenuPrimitive {...props} />
}

/**
 * DropdownMenu Portal - Portals the dropdown content
 */
function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPortalPrimitive>) {
  return <DropdownMenuPortalPrimitive {...props} />
}

/**
 * DropdownMenu Trigger - The button that opens the dropdown
 */
function DropdownMenuTrigger({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuTriggerPrimitive>) {
  return (
    <DropdownMenuTriggerPrimitive
      className={cn(className)}
      {...props}
    />
  )
}

/**
 * DropdownMenu Content - The dropdown menu with increased rounded corners
 */
function DropdownMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuContentPrimitive>) {
  return (
    <DropdownMenuContentPrimitive
      className={cn(
        // Override rounded-md with rounded-xl for increased corner radius (12px instead of 6px)
        "!rounded-xl",
        // White background
        "!bg-white",
        // Subtle border
        "!border !border-gray-100",
        // Proper dropdown shadow
        "![box-shadow:0_4px_20px_rgba(0,0,0,0.12)]",
        className
      )}
      {...props}
    />
  )
}

/**
 * DropdownMenu Group - Groups related items
 */
function DropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuGroupPrimitive>) {
  return <DropdownMenuGroupPrimitive {...props} />
}

/**
 * DropdownMenu Item - Individual item in the dropdown
 */
function DropdownMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuItemPrimitive>) {
  return (
    <DropdownMenuItemPrimitive
      className={cn(
        // Increase text size from text-sm to text-base
        "!text-base",
        // Increase hover background rounded corners from rounded-sm to rounded-lg
        "!rounded-lg",
        // Subtle hover background
        "hover:!bg-gray-50 focus:!bg-gray-50",
        className
      )}
      {...props}
    />
  )
}

/**
 * DropdownMenu Checkbox Item - Checkbox item in the dropdown
 */
function DropdownMenuCheckboxItem({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuCheckboxItemPrimitive>) {
  return <DropdownMenuCheckboxItemPrimitive className={cn(className)} {...props} />
}

/**
 * DropdownMenu Radio Group - Radio group in the dropdown
 */
function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuRadioGroupPrimitive>) {
  return <DropdownMenuRadioGroupPrimitive {...props} />
}

/**
 * DropdownMenu Radio Item - Radio item in the dropdown
 */
function DropdownMenuRadioItem({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuRadioItemPrimitive>) {
  return <DropdownMenuRadioItemPrimitive className={cn(className)} {...props} />
}

/**
 * DropdownMenu Label - Label for a group of items
 */
function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuLabelPrimitive>) {
  return <DropdownMenuLabelPrimitive className={cn(className)} {...props} />
}

/**
 * DropdownMenu Separator - Visual separator between groups
 */
function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuSeparatorPrimitive>) {
  return <DropdownMenuSeparatorPrimitive className={cn(className)} {...props} />
}

/**
 * DropdownMenu Shortcut - Keyboard shortcut display
 */
function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuShortcutPrimitive>) {
  return <DropdownMenuShortcutPrimitive className={cn(className)} {...props} />
}

/**
 * DropdownMenu Sub - Submenu wrapper
 */
function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuSubPrimitive>) {
  return <DropdownMenuSubPrimitive {...props} />
}

/**
 * DropdownMenu Sub Trigger - Trigger for submenu
 */
function DropdownMenuSubTrigger({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuSubTriggerPrimitive>) {
  return <DropdownMenuSubTriggerPrimitive className={cn(className)} {...props} />
}

/**
 * DropdownMenu Sub Content - Submenu content with increased rounded corners
 */
function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuSubContentPrimitive>) {
  return (
    <DropdownMenuSubContentPrimitive
      className={cn(
        // Override rounded-md with rounded-xl for increased corner radius (12px instead of 6px)
        "!rounded-xl",
        // White background
        "!bg-white",
        // Subtle border
        "!border !border-gray-100",
        // Proper dropdown shadow
        "![box-shadow:0_4px_20px_rgba(0,0,0,0.12)]",
        className
      )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
}

/**
 * HaadyUI Select Component
 * 
 * A styled Select component with increased rounded corners for the dropdown menu.
 * Wraps shadcn/ui Select primitives with Haady brand styling.
 */

"use client"

import * as React from "react"
import * as RadixSelect from "@radix-ui/react-select"
import {
  Select as SelectPrimitive,
  SelectContent as SelectContentPrimitive,
  SelectGroup as SelectGroupPrimitive,
  SelectLabel as SelectLabelPrimitive,
  SelectScrollDownButton as SelectScrollDownButtonPrimitive,
  SelectScrollUpButton as SelectScrollUpButtonPrimitive,
  SelectSeparator as SelectSeparatorPrimitive,
  SelectTrigger as SelectTriggerPrimitive,
  SelectValue as SelectValuePrimitive,
} from "@/components/ui/select"
import { cn } from "../utils/cn"

/**
 * Select Root - Wrapper for the select component
 */
function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive>) {
  return <SelectPrimitive {...props} />
}

/**
 * Select Group - Groups related options
 */
function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectGroupPrimitive>) {
  return <SelectGroupPrimitive {...props} />
}

/**
 * Select Value - Displays the selected value
 */
function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectValuePrimitive>) {
  return <SelectValuePrimitive {...props} />
}

/**
 * Select Trigger - The button that opens the dropdown
 */
function SelectTrigger({
  className,
  ...props
}: React.ComponentProps<typeof SelectTriggerPrimitive>) {
  return (
    <SelectTriggerPrimitive
      className={cn(
        // Increase text size from text-sm to text-base
        "!text-base",
        // Align arrow to the right edge - position absolutely
        "!relative",
        "[&>svg]:!absolute [&>svg]:!right-4 [&>svg]:!top-1/2 [&>svg]:!-translate-y-1/2",
        // Remove shadow
        "!shadow-none",
        className
      )}
      {...props}
    />
  )
}

/**
 * Select Content - The dropdown menu with increased rounded corners
 */
function SelectContent({
  className,
  ...props
}: React.ComponentProps<typeof SelectContentPrimitive>) {
  return (
    <SelectContentPrimitive
      className={cn(
        // Override rounded-md with rounded-xl for increased corner radius (12px instead of 6px)
        "!rounded-xl",
        // Remove border
        "!border-0",
        // Centered drop shadow
        "![box-shadow:0_4px_20px_rgba(0,0,0,0.1)]",
        className
      )}
      {...props}
    />
  )
}

/**
 * Select Label - Label for a group of options
 */
function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectLabelPrimitive>) {
  return <SelectLabelPrimitive className={cn(className)} {...props} />
}

/**
 * Select Item - Individual option in the dropdown
 * Renders with a filled primary circle and white checkmark when selected
 */
function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof RadixSelect.Item> & { children: React.ReactNode }) {
  return (
    <RadixSelect.Item
      data-slot="select-item"
      className={cn(
        // Base styles
        "relative flex w-full cursor-pointer items-center gap-2 rounded-lg py-1.5 pr-8 pl-2 rtl:pl-8 rtl:pr-2 rtl:justify-end outline-hidden select-none",
        // Text styling - always dark foreground
        "text-base text-foreground",
        // Hover/focus - subtle gray background, keep text dark
        "focus:bg-gray-100 focus:text-foreground",
        "data-[highlighted]:bg-gray-100 data-[highlighted]:text-foreground",
        // Disabled state
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      {/* Custom checkmark indicator - filled primary circle with white checkmark */}
      <span className="absolute right-2 rtl:left-2 rtl:right-auto flex size-5 items-center justify-center">
        <RadixSelect.ItemIndicator>
          <span className="flex size-5 items-center justify-center rounded-full bg-primary">
            <svg
              className="size-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
        </RadixSelect.ItemIndicator>
      </span>
      <RadixSelect.ItemText className="rtl:w-full rtl:flex rtl:justify-end rtl:text-right">
        {children}
      </RadixSelect.ItemText>
    </RadixSelect.Item>
  )
}

/**
 * Select Separator - Visual separator between groups
 */
function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectSeparatorPrimitive>) {
  return <SelectSeparatorPrimitive className={cn(className)} {...props} />
}

/**
 * Select Scroll Up Button - Button to scroll up in long lists
 */
function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectScrollUpButtonPrimitive>) {
  return <SelectScrollUpButtonPrimitive className={cn(className)} {...props} />
}

/**
 * Select Scroll Down Button - Button to scroll down in long lists
 */
function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectScrollDownButtonPrimitive>) {
  return <SelectScrollDownButtonPrimitive className={cn(className)} {...props} />
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}

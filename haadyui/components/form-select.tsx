/**
 * HaadyUI FormSelect Component
 * 
 * A styled Select component matching the complete profile form styling.
 * Wraps HaadyUI Select with form-specific styling.
 */

"use client"

import * as React from "react"
import {
  Select as SelectPrimitive,
  SelectContent as SelectContentPrimitive,
  SelectGroup as SelectGroupPrimitive,
  SelectItem as SelectItemPrimitive,
  SelectLabel as SelectLabelPrimitive,
  SelectScrollDownButton as SelectScrollDownButtonPrimitive,
  SelectScrollUpButton as SelectScrollUpButtonPrimitive,
  SelectSeparator as SelectSeparatorPrimitive,
  SelectTrigger as SelectTriggerPrimitive,
  SelectValue as SelectValuePrimitive,
} from "./select"
import { cn } from "../utils/cn"

export interface FormSelectProps extends React.ComponentProps<typeof SelectPrimitive> {
  isRTL?: boolean
  placeholder?: string
  children: React.ReactNode
  triggerClassName?: string
  contentClassName?: string
}

/**
 * FormSelect - A styled Select component matching form input styling
 */
function FormSelect({
  isRTL = false,
  placeholder,
  children,
  triggerClassName,
  contentClassName,
  ...props
}: FormSelectProps) {
  return (
    <SelectPrimitive {...props}>
      <SelectTriggerPrimitive 
        className={cn(
          // Match form input styling exactly
          "h-[55px] bg-gray-50 focus:bg-gray-100 rounded-xl transition-colors w-full min-w-0 pl-4 pr-10 !text-[18px] md:!text-[18px] font-medium outline-none text-gray-700 border-0",
          isRTL && "flex-row-reverse",
          triggerClassName
        )}
      >
        {placeholder ? <SelectValuePrimitive placeholder={placeholder} /> : <SelectValuePrimitive />}
      </SelectTriggerPrimitive>
      <SelectContentPrimitive className={cn(isRTL ? 'text-right' : 'text-left', contentClassName)}>
        {children}
      </SelectContentPrimitive>
    </SelectPrimitive>
  )
}

// Re-export sub-components for convenience
const FormSelectContent = SelectContentPrimitive
const FormSelectGroup = SelectGroupPrimitive
const FormSelectItem = SelectItemPrimitive
const FormSelectLabel = SelectLabelPrimitive
const FormSelectScrollDownButton = SelectScrollDownButtonPrimitive
const FormSelectScrollUpButton = SelectScrollUpButtonPrimitive
const FormSelectSeparator = SelectSeparatorPrimitive
const FormSelectValue = SelectValuePrimitive

export {
  FormSelect,
  FormSelectContent,
  FormSelectGroup,
  FormSelectItem,
  FormSelectLabel,
  FormSelectScrollDownButton,
  FormSelectScrollUpButton,
  FormSelectSeparator,
  FormSelectValue,
}

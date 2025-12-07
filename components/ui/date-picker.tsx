'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import { Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useLocale } from '@/i18n/context'

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = 'Pick a date',
  className,
  disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const { locale, isRTL } = useLocale()
  const dateLocale = locale === 'ar' ? ar : enUS

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-12 w-full font-normal bg-white border border-gray-200 rounded-xl hover:border-orange-400 hover:border-2 focus:border-orange-500 focus-visible:border-orange-500 focus:ring-orange-500/20 focus-visible:ring-orange-500/50 focus-visible:ring-[3px] text-gray-900 placeholder:text-gray-400 transition-colors',
            isRTL ? 'justify-end' : 'justify-start',
            !date && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <span className={cn('flex-1', isRTL ? 'text-right' : 'text-left')}>
            {date ? format(date, 'PPP', { locale: dateLocale }) : placeholder}
          </span>
          <CalendarIcon className={cn('h-4 w-4', isRTL ? 'ml-2' : 'ml-2')} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={isRTL ? 'end' : 'start'}>
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => {
            onDateChange?.(selectedDate)
            setOpen(false)
          }}
          disabled={(date) => date > new Date()}
          locale={dateLocale}
          dir={isRTL ? 'rtl' : 'ltr'}
          captionLayout="dropdown"
          fromYear={1900}
          toYear={new Date().getFullYear()}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}


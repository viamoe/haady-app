'use client'

import { cn } from '@/lib/utils'

interface StepperProps {
  steps: Array<{
    number: number
    label: string
  }>
  currentStep: number
  className?: string
  isRTL?: boolean
}

export function Stepper({ steps, currentStep, className, isRTL = false }: StepperProps) {
  return (
    <div className={cn('flex items-center justify-center gap-6 sm:gap-8', isRTL && 'flex-row-reverse', className)}>
      {steps.map((step, index) => {
        const isActive = step.number === currentStep
        const isCompleted = step.number < currentStep
        
        return (
          <div key={step.number} className="flex items-center gap-3 sm:gap-4">
            {/* Step Item */}
            <div className={cn('flex items-center gap-3 sm:gap-4', isRTL && 'flex-row-reverse')}>
              {/* Step Badge */}
              <div
                className={cn(
                  'flex items-center justify-center rounded-full font-semibold text-sm sm:text-base transition-colors',
                  'w-8 h-8 sm:w-10 sm:h-10',
                  'min-w-[2rem] min-h-[2rem] sm:min-w-[2.5rem] sm:min-h-[2.5rem]',
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-200 text-gray-700'
                )}
              >
                {step.number}
              </div>
              
              {/* Step Label */}
              <span
                className={cn(
                  'font-semibold text-sm sm:text-base transition-colors',
                  isActive
                    ? 'text-gray-900 font-bold'
                    : 'text-gray-700'
                )}
              >
                {step.label}
              </span>
            </div>
            
            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="w-8 sm:w-12 h-0.5 bg-gray-200" />
            )}
          </div>
        )
      })}
    </div>
  )
}


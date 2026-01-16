/**
 * HaadyUI Design System
 * A design system based on shadcn with Haady brand theming and animations
 */

// Components
export { Button, buttonVariants, type ButtonProps } from './components/button'
export { Input, type InputProps } from './components/input'
export { EmailInput, type EmailInputProps, validateEmail, type EmailValidationResult } from './components/email-input'
export { UsernameInput, type UsernameInputProps, validateUsername, suggestUsernames, type UsernameValidationResult, type TranslationFunction } from './components/username-input'

// Utils
export { cn } from './utils/cn'

// Hooks
export {
  defaultSpringConfig,
  defaultHoverScale,
  defaultTapScale,
} from './hooks/use-animation'

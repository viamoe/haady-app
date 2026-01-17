/**
 * HaadyUI Design System
 * A design system based on shadcn with Haady brand theming and animations
 */

// Components
export { Button, buttonVariants, type ButtonProps } from './components/button'
export { Input, type InputProps } from './components/input'
export { EmailInput, type EmailInputProps, validateEmail, type EmailValidationResult } from './components/email-input'
export { UsernameInput, type UsernameInputProps, validateUsername, suggestUsernames, RESERVED_USERNAMES, type UsernameValidationResult, type TranslationFunction } from './components/username-input'
export { Header, type HeaderProps, type HeaderUser, type HeaderUserProfile } from './components/header'
export { FormInput, type FormInputProps } from './components/form-input'
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
} from './components/form-select'
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
} from './components/select'
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
} from './components/dropdown-menu'

// Utils
export { cn } from './utils/cn'

// Hooks
export {
  defaultSpringConfig,
  defaultHoverScale,
  defaultTapScale,
} from './hooks/use-animation'

"use client"

import {
  CheckCircle2,
  Info,
  XCircle,
  AlertTriangle,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-center"
      icons={{
        success: <CheckCircle2 className="size-5 text-green-500" />,
        info: <Info className="size-5 text-blue-500" />,
        warning: <AlertTriangle className="size-5 text-amber-500" />,
        error: <XCircle className="size-5 text-red-500" />,
      }}
      style={
        {
          "--normal-bg": "white",
          "--normal-text": "#111827",
          "--normal-border": "#e5e7eb",
          "--border-radius": "0.5rem",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }

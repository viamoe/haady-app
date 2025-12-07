'use client';

import { useEffect } from 'react';
import { toast as sonnerToast } from 'sonner';
import { CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react';

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const DEFAULT_DURATION = 5000; // 5 seconds

// Track active toast to prevent multiple toasts
let activeToastId: string | number | null = null;

// Toast with icon component
const ToastWithIcon = ({ 
  title, 
  description,
  duration = DEFAULT_DURATION,
  type = 'success',
  onComplete,
  action
}: { 
  title: string; 
  description?: string;
  duration?: number;
  type?: 'success' | 'error' | 'info' | 'warning';
  onComplete?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}) => {
  const typeConfig = {
    success: {
      icon: CheckCircle2,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    error: {
      icon: XCircle,
      iconColor: 'text-red-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
    info: {
      icon: Info,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
    },
  };

  const config = typeConfig[type];
  const IconComponent = config.icon;

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <div className={`flex items-start gap-3 ${config.bgColor} border ${config.borderColor} rounded-lg px-4 py-3 min-w-[320px] max-w-[420px] shadow-lg`}>
      <div className="flex-shrink-0 mt-0.5">
        <IconComponent className={`w-5 h-5 ${config.iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        {description && (
          <p className="text-xs text-gray-600 mt-1">{description}</p>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="ml-2 px-3 py-1.5 text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-md transition-colors flex-shrink-0"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};


// Helper function to show toast with delay if needed
const showToast = (
  title: string,
  options: ToastOptions | undefined,
  type: 'success' | 'error' | 'info' | 'warning'
): number | string | undefined => {
  const show = () => {
    const ToastComponent = ToastWithIcon;
    const toastProps = {
      title,
      description: options?.description,
      duration: options?.duration || DEFAULT_DURATION,
      type,
      action: options?.action,
      onComplete: () => {
        activeToastId = null;
      },
    };
    
    const toastId = sonnerToast.custom(
      (id) => {
        return <ToastComponent {...toastProps} />;
      },
      {
        duration: options?.duration || DEFAULT_DURATION,
        onDismiss: () => {
          activeToastId = null;
        },
        onAutoClose: () => {
          activeToastId = null;
        },
      }
    );
    activeToastId = toastId;
    return toastId;
  };

  // If there's an active toast, dismiss it first and wait before showing new one
  if (activeToastId !== null) {
    sonnerToast.dismiss(activeToastId);
    activeToastId = null;
    setTimeout(show, 300);
    return undefined;
  }

  return show();
};

// Custom toast wrapper functions
export const toast = {
  success: (title: string, options?: ToastOptions) => {
    return showToast(title, options, 'success');
  },

  error: (title: string, options?: ToastOptions) => {
    return showToast(title, options, 'error');
  },

  info: (title: string, options?: ToastOptions) => {
    return showToast(title, options, 'info');
  },

  warning: (title: string, options?: ToastOptions) => {
    return showToast(title, options, 'warning');
  },

  // Keep custom for special cases like the auth form
  custom: sonnerToast.custom,
};


import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatFunctionName } from '@/lib/parseFunctionCalls';

export type ExecutionStatus = 'idle' | 'executing' | 'success' | 'error';

export interface FunctionExecutionModalProps {
  isOpen: boolean;
  functionName: string | null;
  functionArgs: Record<string, any> | null;
  status: ExecutionStatus;
  resultMessage?: string;
  currentIndex?: number;
  totalCount?: number;
  onClose: () => void;
}

const FunctionExecutionModal: React.FC<FunctionExecutionModalProps> = ({
  isOpen,
  functionName,
  functionArgs,
  status,
  resultMessage,
  currentIndex = 1,
  totalCount = 1,
  onClose,
}) => {
  // Auto-close after success (3 seconds)
  useEffect(() => {
    if (status === 'success' || status === 'error') {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, onClose]);

  if (!isOpen) return null;

  const statusConfig = {
    idle: {
      icon: 'hourglass_empty',
      label: 'Waiting...',
      color: 'text-neutral-500',
      bgColor: 'bg-neutral-100',
    },
    executing: {
      icon: 'sync',
      label: 'Executing...',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    success: {
      icon: 'check_circle',
      label: 'Complete',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    error: {
      icon: 'error',
      label: 'Error',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  };

  const config = statusConfig[status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={status !== 'executing' ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-lg shadow-2xl border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className={cn('px-5 py-4 border-b border-neutral-200', config.bgColor)}>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'material-symbols-outlined text-2xl',
                config.color,
                status === 'executing' && 'animate-spin'
              )}
            >
              {config.icon}
            </span>
            <div>
              <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
                {status === 'executing'
                  ? totalCount > 1
                    ? `Executing Function ${currentIndex}/${totalCount}`
                    : 'Executing Function'
                  : status === 'success'
                    ? totalCount > 1
                      ? `All ${totalCount} Functions Complete`
                      : 'Function Complete'
                    : status === 'error'
                      ? 'Function Error'
                      : 'Function Call'}
              </h2>
              <p className={cn('text-xs font-mono', config.color)}>{config.label}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Function Name */}
          <div>
            <p className="text-[10px] uppercase text-neutral-500 font-mono mb-1">Function</p>
            <p className="text-lg font-mono font-bold text-neutral-900">
              {functionName || 'Unknown'}
            </p>
            <p className="text-xs text-neutral-500">
              {functionName ? formatFunctionName(functionName) : ''}
            </p>
          </div>

          {/* Arguments */}
          {functionArgs && Object.keys(functionArgs).length > 0 && (
            <div>
              <p className="text-[10px] uppercase text-neutral-500 font-mono mb-1">Arguments</p>
              <div className="bg-neutral-100 rounded-sm p-3 border border-neutral-200 overflow-x-auto">
                <pre className="text-xs font-mono text-neutral-800 whitespace-pre-wrap">
                  {JSON.stringify(functionArgs, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Result Message */}
          {resultMessage && (status === 'success' || status === 'error') && (
            <div>
              <p className="text-[10px] uppercase text-neutral-500 font-mono mb-1">Result</p>
              <div className={cn(
                'rounded-sm p-3 border',
                status === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              )}>
                <p className="text-xs font-mono text-neutral-800 whitespace-pre-wrap">
                  {resultMessage}
                </p>
              </div>
            </div>
          )}

          {/* Progress Bar for Executing */}
          {status === 'executing' && totalCount > 1 && (
            <div>
              <p className="text-[10px] uppercase text-neutral-500 font-mono mb-1">
                Progress {currentIndex} / {totalCount}
              </p>
              <div className="relative h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-blue-600 transition-all duration-300"
                  style={{ width: `${(currentIndex / totalCount) * 100}%` }}
                />
              </div>
            </div>
          )}
          {status === 'executing' && totalCount === 1 && (
            <div className="relative h-1 bg-neutral-200 rounded-full overflow-hidden">
              <div className="absolute inset-0 bg-blue-500 animate-pulse" />
              <div className="absolute h-full w-1/3 bg-blue-600 animate-[slide_1s_ease-in-out_infinite]" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-200 bg-neutral-50 flex justify-between items-center">
          <p className="text-[10px] text-neutral-500 font-mono">
            {status === 'executing' ? 'Please wait...' : 'Auto-closing in 3s'}
          </p>
          {status !== 'executing' && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="font-mono text-xs"
            >
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Custom animation keyframes */}
      <style>{`
        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
};

export default FunctionExecutionModal;

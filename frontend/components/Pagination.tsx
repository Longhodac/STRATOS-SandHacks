import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  className,
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  if (totalItems === 0 || totalPages <= 1) {
    return null;
  }

  return (
    <div className={cn('flex items-center justify-between py-3 px-1', className)}>
      {/* Left arrow */}
      <Button
        variant="outline"
        size="sm"
        className="font-mono text-xs rounded-sm border-neutral-300 text-neutral-800 hover:bg-neutral-100 disabled:opacity-50"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!canGoPrevious}
      >
        <span className="material-symbols-outlined text-sm">chevron_left</span>
      </Button>

      {/* Page info */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="font-mono text-xs text-neutral-700">
          Page {currentPage} of {totalPages}
        </span>
        <span className="font-mono text-[10px] text-neutral-500">
          {startItem}-{endItem} of {totalItems}
        </span>
      </div>

      {/* Right arrow */}
      <Button
        variant="outline"
        size="sm"
        className="font-mono text-xs rounded-sm border-neutral-300 text-neutral-800 hover:bg-neutral-100 disabled:opacity-50"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!canGoNext}
      >
        <span className="material-symbols-outlined text-sm">chevron_right</span>
      </Button>
    </div>
  );
};

export default Pagination;

import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className={cn(sizes[size], 'animate-spin text-primary-400', className)} />
    </div>
  );
}

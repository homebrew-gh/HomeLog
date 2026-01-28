import * as React from 'react';
import { format, parse, isValid } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Format date as MM/DD/YYYY
function formatDateString(date: Date): string {
  return format(date, 'MM/dd/yyyy');
}

// Parse MM/DD/YYYY string to Date
function parseDateString(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Try to parse MM/DD/YYYY format
  const parsed = parse(dateStr, 'MM/dd/yyyy', new Date());
  if (isValid(parsed)) return parsed;
  
  // Also try M/D/YYYY format for flexibility
  const parsedFlexible = parse(dateStr, 'M/d/yyyy', new Date());
  if (isValid(parsedFlexible)) return parsedFlexible;
  
  return null;
}

// Get today's date formatted as MM/DD/YYYY
function getTodayFormatted(): string {
  return formatDateString(new Date());
}

export interface DateInputProps {
  /** Current value in MM/DD/YYYY format */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Optional label for the input */
  label?: string;
  /** Optional id for the input */
  id?: string;
  /** Optional placeholder text */
  placeholder?: string;
  /** Whether to show the "Today" checkbox */
  showTodayCheckbox?: boolean;
  /** Label for the "Today" checkbox */
  todayCheckboxLabel?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Additional class names for the container */
  className?: string;
  /** Additional class names for the input */
  inputClassName?: string;
}

export function DateInput({
  value,
  onChange,
  label,
  id,
  placeholder = 'MM/DD/YYYY',
  showTodayCheckbox = false,
  todayCheckboxLabel,
  disabled = false,
  className,
  inputClassName,
}: DateInputProps) {
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [isTodayChecked, setIsTodayChecked] = React.useState(false);
  
  const inputId = id || React.useId();
  const checkboxId = `${inputId}-today`;
  
  // Parse current value to Date for calendar
  const selectedDate = React.useMemo(() => parseDateString(value), [value]);
  
  // Handle calendar date selection
  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      onChange(formatDateString(date));
      setIsTodayChecked(false);
    }
    setIsCalendarOpen(false);
  };
  
  // Handle text input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    if (newValue) {
      setIsTodayChecked(false);
    }
  };
  
  // Handle "Today" checkbox
  const handleTodayChange = (checked: boolean) => {
    setIsTodayChecked(checked);
    if (checked) {
      onChange(getTodayFormatted());
    }
  };

  // Update isTodayChecked when value changes externally
  React.useEffect(() => {
    if (value === getTodayFormatted()) {
      // Don't auto-check, just allow it to be manually checked
    } else {
      setIsTodayChecked(false);
    }
  }, [value]);

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={inputId}>{label}</Label>
      )}
      <div className="flex gap-2">
        <Input
          id={inputId}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled || isTodayChecked}
          className={cn(
            isTodayChecked && 'opacity-50',
            inputClassName
          )}
        />
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={disabled || isTodayChecked}
              className={cn(isTodayChecked && 'opacity-50')}
            >
              <CalendarIcon className="h-4 w-4" />
              <span className="sr-only">Open calendar</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate || undefined}
              onSelect={handleCalendarSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      {showTodayCheckbox && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id={checkboxId}
            checked={isTodayChecked}
            onCheckedChange={(checked) => handleTodayChange(checked === true)}
            disabled={disabled}
          />
          <Label
            htmlFor={checkboxId}
            className="text-sm font-normal cursor-pointer"
          >
            {todayCheckboxLabel || `Today (${getTodayFormatted()})`}
          </Label>
        </div>
      )}
    </div>
  );
}

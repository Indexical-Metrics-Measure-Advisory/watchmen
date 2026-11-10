import * as React from "react"
import { Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface SearchableSelectProps {
  id?: string
  value: string
  onValueChange: (value: string) => void
  options: string[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
}

// Case-insensitive substring match. Every hit scores the same, so the
// options keep their original order instead of being re-ranked.
const matchOption = (option: string, search: string) =>
  option.toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0

/**
 * Select look-alike with a search box, for option lists too long to scan.
 * Built on Popover + Command because Radix Select cannot filter its items.
 */
const SearchableSelect = ({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  className,
}: SearchableSelectProps) => {
  const [open, setOpen] = React.useState(false)

  return (
    // modal keeps the list wheel-scrollable when rendered inside a Dialog,
    // whose scroll lock otherwise swallows wheel events on portaled content.
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        {/* defaultValue highlights the current option and scrolls it into view on open */}
        <Command defaultValue={value} filter={matchOption}>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  className="pl-8"
                  onSelect={() => {
                    onValueChange(option)
                    setOpen(false)
                  }}
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    {option === value && <Check className="h-4 w-4" />}
                  </span>
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export { SearchableSelect }

"use client";

import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrg } from "@/context/org-context";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";

export function PgSwitcher() {
  const { pgs, currentPg, switchPg } = useOrg();
  const [open, setOpen] = useState(false);

  if (!pgs || pgs.length <= 1) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between text-sm"
        >
          <Building2 className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <span className="truncate">
            {currentPg?.name || "Select PG..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search PG..." />
          <CommandList>
            <CommandEmpty>No PG found.</CommandEmpty>
            <CommandGroup>
              {pgs.map((pg) => (
                <CommandItem
                  key={pg.id}
                  value={pg.name}
                  onSelect={() => {
                    switchPg(pg.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      currentPg?.id === pg.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {pg.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

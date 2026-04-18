"use client";

import { debounce } from "@tanstack/pacer";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SearchSelectorProps {
  placeholder?: string;
  apiEndpoint: string;
  renderItem?: (item: any) => React.ReactNode;
}

export function SearchSelector({
  placeholder = "Search...",
  apiEndpoint,
  renderItem,
}: SearchSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("query") || "";

  const [inputValue, setInputValue] = React.useState(initialQuery);
  const [debouncedValue, setDebouncedValue] = React.useState(initialQuery);
  const [isOpen, setIsOpen] = React.useState(false);

  const debouncedSetQuery = React.useMemo(
    () =>
      debounce(
        (val: string) => {
          setDebouncedValue(val);
        },
        { wait: 300 },
      ),
    [],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    debouncedSetQuery(value);
    if (value.length > 0) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: [apiEndpoint, debouncedValue],
    queryFn: async () => {
      if (!debouncedValue) return [];
      const res = await fetch(
        `${apiEndpoint}?query=${encodeURIComponent(debouncedValue)}`,
      );
      const json = await res.json();
      return (json.data || []) as any[];
    },
    enabled: debouncedValue.length > 0,
  });

  const updateSearchParams = (query: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (query) {
      params.set("query", query);
    } else {
      params.delete("query");
    }
    params.delete("page"); // Reset page when searching
    router.push(`?${params.toString()}`);
    setIsOpen(false);
  };

  const handleSearch = () => {
    updateSearchParams(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleSelect = (item: any) => {
    const value = item.name || (item.customer ? item.customer.name : "");
    setInputValue(value);
    updateSearchParams(value);
  };

  const defaultRenderItem = (item: any) => {
    if (item.name) {
      return (
        <div className="flex flex-col">
          <div className="font-medium">{item.name}</div>
          {item.price !== undefined && (
            <div className="text-xs text-muted-foreground">
              ${Number(item.price).toFixed(2)}
            </div>
          )}
          {item.email && (
            <div className="text-xs text-muted-foreground">{item.email}</div>
          )}
        </div>
      );
    }
    if (item.customer) {
      return (
        <div className="flex flex-col">
          <div className="font-medium">Invoice for {item.customer.name}</div>
          <div className="text-xs text-muted-foreground">
            ${Number(item.total).toFixed(2)} - {item.status}
          </div>
        </div>
      );
    }
    return <div>{JSON.stringify(item)}</div>;
  };

  return (
    <div className="flex w-full max-w-sm items-center space-x-2 relative">
      <div className="relative flex-1">
        <Popover
          open={isOpen && (isLoading || (data && data.length > 0))}
          onOpenChange={setIsOpen}
        >
          <PopoverTrigger asChild>
            <div className="w-full">
              <Input
                type="text"
                placeholder={placeholder}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className="pr-8"
              />
              {isLoading && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent
            className="p-0 w-(--radix-popover-trigger-width)"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="max-h-75 overflow-y-auto p-1">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Searching...
                </div>
              ) : data && data.length > 0 ? (
                <div className="flex flex-col">
                  {data.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                      onClick={() => handleSelect(item)}
                    >
                      {renderItem ? renderItem(item) : defaultRenderItem(item)}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <Button type="button" size="icon" onClick={handleSearch}>
        <Search className="h-4 w-4" />
      </Button>
    </div>
  );
}

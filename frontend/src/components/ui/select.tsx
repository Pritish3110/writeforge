import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp, Search } from "lucide-react";

import { cn } from "@/lib/utils";

const DROPDOWN_VISIBLE_ITEM_LIMIT = 6;
const DROPDOWN_SCROLL_MAX_HEIGHT = "max-h-[15.75rem]";

const getNodeText = (node: React.ReactNode): string => {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(getNodeText).join(" ");
  }

  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return getNodeText(node.props.children);
  }

  return "";
};

const isSelectItemElement = (
  node: React.ReactNode,
): node is React.ReactElement<{ value: string; children?: React.ReactNode }> =>
  React.isValidElement<{ value?: unknown; children?: React.ReactNode }>(node) &&
  typeof node.props.value === "string";

const countSelectItems = (children: React.ReactNode): number =>
  React.Children.toArray(children).reduce((count, child) => {
    if (isSelectItemElement(child)) {
      return count + 1;
    }

    if (React.isValidElement<{ children?: React.ReactNode }>(child)) {
      return count + countSelectItems(child.props.children);
    }

    return count;
  }, 0);

const filterSelectChildren = (
  children: React.ReactNode,
  query: string,
): React.ReactNode =>
  React.Children.toArray(children).map((child) => {
    if (isSelectItemElement(child)) {
      const searchText = `${child.props.value} ${getNodeText(child.props.children)}`.toLowerCase();
      const matchesSearch = searchText.includes(query);

      return matchesSearch ? child : null;
    }

    if (React.isValidElement<{ children?: React.ReactNode }>(child)) {
      const filteredChildren = filterSelectChildren(child.props.children, query);
      const hasFilteredChildren = React.Children.toArray(filteredChildren).some(Boolean);

      if (!hasFilteredChildren) {
        return null;
      }

      return React.cloneElement(child, undefined, filteredChildren);
    }

    return child;
  });

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-[10px] border border-input bg-transparent px-3 py-2 text-sm font-normal text-foreground transition-[background-color,border-color,color] duration-150 ease-out placeholder:text-muted-foreground hover:border-foreground/14 hover:bg-accent/70 hover:text-accent-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> & {
    showScrollButtons?: boolean;
  }
>(({ className, children, position = "popper", showScrollButtons = true, ...props }, ref) => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const itemCount = countSelectItems(children);
  const hasOverflow = itemCount > DROPDOWN_VISIBLE_ITEM_LIMIT;
  const shouldSearch = hasOverflow;
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const renderedChildren = shouldSearch
    ? filterSelectChildren(children, normalizedQuery)
    : children;
  const hasRenderedChildren = React.Children.toArray(renderedChildren).some(Boolean);

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          "relative z-50 min-w-[8rem] overflow-hidden rounded-md border border-border/70 bg-card/95 p-0 text-popover-foreground shadow-none backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className,
        )}
        position={position}
        {...props}
      >
        {shouldSearch ? (
          <div className="flex items-center border-b border-border/70 px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              placeholder="Search options..."
              aria-label="Search dropdown options"
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        ) : null}
        {hasOverflow && showScrollButtons ? (
          <SelectScrollUpButton className="border-b border-border/60 bg-card/95 text-muted-foreground" />
        ) : null}
        <SelectPrimitive.Viewport
          className={cn(
            "overflow-y-auto p-1 [scrollbar-width:thin]",
            hasOverflow ? DROPDOWN_SCROLL_MAX_HEIGHT : "max-h-60",
            position === "popper" &&
              "w-full min-w-[var(--radix-select-trigger-width)]",
          )}
        >
          {hasRenderedChildren ? (
            renderedChildren
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">No matching options.</div>
          )}
        </SelectPrimitive.Viewport>
        {hasOverflow && showScrollButtons ? (
          <SelectScrollDownButton className="border-t border-border/60 bg-card/95 text-muted-foreground" />
        ) : null}
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
});
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label ref={ref} className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)} {...props} />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-2.5 pl-8 pr-3 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-neon-cyan" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};

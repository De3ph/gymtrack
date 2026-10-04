/**
 * Roomier sidebar row metrics than the shadcn default (`h-8 p-2`) — 40px tall
 * rows are easier to hit and give the rail a less cramped feel.
 *
 * Safe in the collapsed state: `sidebarMenuButtonVariants` pins the icon rail
 * with `group-data-[collapsible=icon]:size-8! p-2!`, and those `!important`
 * utilities win over these, so the rail stays square.
 */
export const SIDEBAR_ITEM_SPACING = "h-10 px-3";

export const linkStyles = {
  brand: 'text-xl font-medium tracking-[-0.04em] text-foreground hover:text-foreground/80 transition-colors duration-200',
} as const;

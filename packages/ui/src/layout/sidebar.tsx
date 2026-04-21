"use client";

/*
 * Sidebar — the chronicle product shell's left rail. A compound primitive:
 *
 *   <Sidebar>
 *     <SidebarHeader>
 *       <WorkspaceSwitcher … />   (optional)
 *     </SidebarHeader>
 *
 *     <SidebarStatus tone="nominal" label="System Nominal" trailing="00:42:01" />
 *
 *     <SidebarNav aria-label="Main">
 *       <SidebarNavSection title="Workspace">
 *         <SidebarNavItem href="/dashboard" icon={…} isActive>Overview</SidebarNavItem>
 *         <SidebarNavItem href="/events" icon={…} status="LIVE">Events</SidebarNavItem>
 *       </SidebarNavSection>
 *     </SidebarNav>
 *
 *     <SidebarMeta
 *       rows={[
 *         { label: "Version",     value: "1.0.0" },
 *         { label: "Environment", value: "PROD", tone: "nominal" },
 *       ]}
 *     />
 *
 *     <SidebarFooter>
 *       <SidebarUserCard name="…" email="…" onSignOut={…} />
 *     </SidebarFooter>
 *   </Sidebar>
 *
 * The shell is responsive (`hidden lg:flex`) and fixed-positioned by
 * default — same geometry as the existing frontend/env-manager sidebars —
 * but the `variant` prop lets it render as a static flex column when
 * consumers host it inside their own layout grid.
 */

import * as React from "react";
import { Link as RACLink } from "react-aria-components";

import { tv, type VariantProps } from "../utils/tv";
import { composeTwRenderProps } from "../utils/compose";
import { Avatar } from "../primitives/avatar";

// ─────────────────────────────────────────────────────────────
// Sidebar shell
// ─────────────────────────────────────────────────────────────

const sidebarStyles = tv({
  slots: {
    root:
      "flex-col bg-surface-01 border-r border-hairline " +
      "[&>*]:border-hairline",
    inner: "flex h-full flex-col",
  },
  variants: {
    variant: {
      /** Fixed-width panel pinned to the viewport edge (dashboard shells). */
      fixed:
        "hidden lg:fixed lg:inset-y-0 lg:flex lg:w-[240px] lg:flex-col",
      /** Static flex column (hosts render it inside their own grid). */
      static: "flex w-[240px] flex-col",
    },
    width: {
      sm: "lg:w-[200px] w-[200px]",
      md: "lg:w-[240px] w-[240px]",
      lg: "lg:w-[280px] w-[280px]",
    },
  },
  defaultVariants: { variant: "fixed", width: "md" },
});

type SidebarVariantProps = VariantProps<typeof sidebarStyles>;

export interface SidebarProps
  extends React.HTMLAttributes<HTMLElement>,
    SidebarVariantProps {
  variant?: "fixed" | "static";
  width?: "sm" | "md" | "lg";
}

function SidebarRoot({
  variant = "fixed",
  width = "md",
  className,
  children,
  ...props
}: SidebarProps) {
  const slots = React.useMemo(
    () => sidebarStyles({ variant, width }),
    [variant, width],
  );
  return (
    <aside
      data-slot="sidebar"
      className={slots.root({ className })}
      {...props}
    >
      <div className={slots.inner()}>{children}</div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
// Sidebar header — brand / workspace switcher slot
// ─────────────────────────────────────────────────────────────

const headerStyles = tv({
  base:
    "flex items-center px-s-4 border-b border-hairline bg-surface-02",
  variants: {
    height: {
      sm: "h-[44px]",
      md: "h-[52px]",
      lg: "h-[64px]",
    },
  },
  defaultVariants: { height: "md" },
});

export interface SidebarHeaderProps
  extends React.HTMLAttributes<HTMLDivElement> {
  height?: "sm" | "md" | "lg";
}

export function SidebarHeader({
  height,
  className,
  children,
  ...props
}: SidebarHeaderProps) {
  const cls = React.useMemo(
    () => headerStyles({ height, className }),
    [height, className],
  );
  return (
    <div data-slot="sidebar-header" className={cls} {...props}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sidebar status strip — colored banner with tone + label + trailing
// ─────────────────────────────────────────────────────────────

const statusStyles = tv({
  slots: {
    root:
      "flex items-center justify-between gap-s-2 border-b border-hairline px-s-4 py-s-3",
    label:
      "inline-flex items-center gap-s-2 font-mono text-mono-sm uppercase tracking-tactical",
    dot: "h-[6px] w-[6px] shrink-0 rounded-full animate-chron-pulse",
    trailing:
      "font-mono text-mono-sm tabular-nums text-ink-dim text-right",
  },
  variants: {
    tone: {
      nominal: {
        root: "bg-[rgba(74,222,128,0.05)]",
        label: "text-event-green",
        dot: "bg-event-green",
      },
      data: {
        root: "bg-[rgba(45,212,191,0.05)]",
        label: "text-event-teal",
        dot: "bg-event-teal",
      },
      caution: {
        root: "bg-[rgba(251,191,36,0.05)]",
        label: "text-event-amber",
        dot: "bg-event-amber",
      },
      critical: {
        root: "bg-[rgba(239,68,68,0.05)]",
        label: "text-event-red",
        dot: "bg-event-red",
      },
      ember: {
        root: "bg-[rgba(216,67,10,0.05)]",
        label: "text-ember",
        dot: "bg-ember",
      },
      neutral: {
        root: "bg-surface-02",
        label: "text-ink-lo",
        dot: "bg-ink-dim",
      },
    },
  },
  defaultVariants: { tone: "nominal" },
});

type SidebarStatusVariantProps = VariantProps<typeof statusStyles>;

export interface SidebarStatusProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children">,
    SidebarStatusVariantProps {
  label: React.ReactNode;
  trailing?: React.ReactNode;
  /** Show pulsing dot. Defaults to true. */
  pulse?: boolean;
  tone?: "nominal" | "data" | "caution" | "critical" | "ember" | "neutral";
}

export function SidebarStatus({
  label,
  trailing,
  pulse = true,
  tone,
  className,
  ...props
}: SidebarStatusProps) {
  const slots = React.useMemo(() => statusStyles({ tone }), [tone]);
  return (
    <div
      data-slot="sidebar-status"
      className={slots.root({ className })}
      {...props}
    >
      <span className={slots.label()}>
        <span
          className={slots.dot()}
          style={!pulse ? { animation: "none" } : undefined}
        />
        {label}
      </span>
      {trailing ? <span className={slots.trailing()}>{trailing}</span> : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sidebar nav — ARIA-labelled scrolling region with sections/items
// ─────────────────────────────────────────────────────────────

const navStyles = tv({
  slots: {
    root: "flex-1 overflow-y-auto py-s-4",
    sectionHeader:
      "px-s-4 mb-s-2 font-mono text-mono-sm uppercase tracking-tactical text-ink-dim",
    sectionBody: "flex flex-col gap-[2px] px-s-2",
  },
});

export interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  "aria-label"?: string;
}

export function SidebarNav({
  "aria-label": ariaLabel = "Sidebar",
  className,
  children,
  ...props
}: SidebarNavProps) {
  const slots = React.useMemo(() => navStyles(), []);
  return (
    <nav
      data-slot="sidebar-nav"
      aria-label={ariaLabel}
      className={slots.root({ className })}
      {...props}
    >
      {children}
    </nav>
  );
}

export interface SidebarNavSectionProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
}

export function SidebarNavSection({
  title,
  className,
  children,
  ...props
}: SidebarNavSectionProps) {
  const slots = React.useMemo(() => navStyles(), []);
  return (
    <div data-slot="sidebar-nav-section" className={className} {...props}>
      {title ? <div className={slots.sectionHeader()}>{title}</div> : null}
      <div className={slots.sectionBody()}>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sidebar nav item — RAC Link for client-side nav, or plain button
// ─────────────────────────────────────────────────────────────

const navItemStyles = tv({
  slots: {
    root:
      "relative flex items-center gap-s-3 px-s-3 py-s-2 " +
      "font-sans text-sm outline-none " +
      "transition-colors duration-fast ease-out " +
      "border-l-2 border-transparent " +
      "data-[hovered=true]:bg-surface-02 data-[hovered=true]:text-ink-hi " +
      "data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 " +
      "data-[focus-visible=true]:outline-ember " +
      "data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed",
    icon: "shrink-0 text-ink-dim",
    label: "flex-1 truncate",
    status:
      "ml-auto flex items-center gap-s-1 px-s-2 py-[2px] rounded-xs " +
      "font-mono text-mono-xs uppercase tracking-tactical",
  },
  variants: {
    isActive: {
      true: {
        root: "border-l-ember bg-row-active text-ink-hi",
        icon: "text-ember",
      },
      false: { root: "text-ink-lo" },
    },
  },
  defaultVariants: { isActive: false },
});

export interface SidebarNavItemProps {
  /** If omitted, renders as a plain button. */
  href?: string;
  isActive?: boolean;
  isDisabled?: boolean;
  icon?: React.ReactNode;
  /** Small right-aligned status pill (e.g. "LIVE", "BETA"). */
  status?: React.ReactNode;
  /** Status pill color tone. */
  statusTone?: "nominal" | "ember" | "data" | "caution" | "critical";
  /** Click/press handler (mainly for non-href items). */
  onPress?: () => void;
  /** Consumer className. */
  className?: string;
  children: React.ReactNode;
}

const statusToneClass: Record<
  NonNullable<SidebarNavItemProps["statusTone"]>,
  string
> = {
  nominal: "bg-[rgba(74,222,128,0.1)] text-event-green",
  ember: "bg-[rgba(216,67,10,0.1)] text-ember",
  data: "bg-[rgba(45,212,191,0.1)] text-event-teal",
  caution: "bg-[rgba(251,191,36,0.1)] text-event-amber",
  critical: "bg-[rgba(239,68,68,0.1)] text-event-red",
};

export function SidebarNavItem({
  href,
  isActive = false,
  isDisabled = false,
  icon,
  status,
  statusTone = "nominal",
  onPress,
  className,
  children,
}: SidebarNavItemProps) {
  const slots = React.useMemo(() => navItemStyles({ isActive }), [isActive]);
  const content = (
    <>
      {icon ? <span className={slots.icon()}>{icon}</span> : null}
      <span className={slots.label()}>{children}</span>
      {status ? (
        <span className={`${slots.status()} ${statusToneClass[statusTone]}`}>
          {status}
        </span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <RACLink
        data-slot="sidebar-nav-item"
        href={href}
        isDisabled={isDisabled}
        className={composeTwRenderProps(className, slots.root())}
        aria-current={isActive ? "page" : undefined}
      >
        {content}
      </RACLink>
    );
  }

  return (
    <button
      data-slot="sidebar-nav-item"
      type="button"
      disabled={isDisabled}
      onClick={onPress}
      className={`${slots.root()}${className ? ` ${className}` : ""}`}
      data-disabled={isDisabled || undefined}
      aria-current={isActive ? "page" : undefined}
    >
      {content}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Sidebar meta — system-info key/value grid
// ─────────────────────────────────────────────────────────────

const metaStyles = tv({
  slots: {
    root: "border-t border-hairline bg-surface-02 px-s-4 py-s-3",
    title:
      "mb-s-2 font-mono text-mono-sm uppercase tracking-tactical text-ink-dim",
    rows: "flex flex-col gap-[6px]",
    row: "flex items-center justify-between",
    label: "font-sans text-xs text-ink-dim",
    value: "font-mono text-mono-sm tabular-nums",
  },
  variants: {
    valueTone: {
      default: { value: "text-ink-lo" },
      nominal: { value: "text-event-green" },
      caution: { value: "text-event-amber" },
      critical: { value: "text-event-red" },
      ember: { value: "text-ember" },
      data: { value: "text-event-teal" },
    },
  },
});

export interface SidebarMetaRow {
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: "default" | "nominal" | "caution" | "critical" | "ember" | "data";
}

export interface SidebarMetaProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  rows: SidebarMetaRow[];
}

export function SidebarMeta({
  title = "System info",
  rows,
  className,
  ...props
}: SidebarMetaProps) {
  const slots = React.useMemo(() => metaStyles(), []);
  return (
    <div
      data-slot="sidebar-meta"
      className={slots.root({ className })}
      {...props}
    >
      {title ? <div className={slots.title()}>{title}</div> : null}
      <div className={slots.rows()}>
        {rows.map((row, i) => {
          const toneSlots = metaStyles({ valueTone: row.tone ?? "default" });
          return (
            <div key={i} className={slots.row()}>
              <span className={slots.label()}>{row.label}</span>
              <span className={toneSlots.value()}>{row.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sidebar footer — slot for user card / legal line
// ─────────────────────────────────────────────────────────────

const footerStyles = tv({
  base: "border-t border-hairline",
  variants: {
    padded: { true: "px-s-4 py-s-3 bg-surface-02" },
  },
  defaultVariants: { padded: false },
});

type SidebarFooterVariantProps = VariantProps<typeof footerStyles>;

export interface SidebarFooterProps
  extends React.HTMLAttributes<HTMLDivElement>,
    SidebarFooterVariantProps {
  padded?: boolean;
}

export function SidebarFooter({
  padded,
  className,
  children,
  ...props
}: SidebarFooterProps) {
  const cls = React.useMemo(
    () => footerStyles({ padded, className }),
    [padded, className],
  );
  return (
    <div data-slot="sidebar-footer" className={cls} {...props}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sidebar user card — avatar + name + email + sign-out
// ─────────────────────────────────────────────────────────────

const userCardStyles = tv({
  slots: {
    root:
      "flex items-center justify-between gap-s-2 bg-surface-02 px-s-4 py-s-3",
    identity: "flex min-w-0 items-center gap-s-2",
    text: "min-w-0 flex-1",
    name: "truncate text-xs text-ink-hi",
    email: "truncate font-mono text-mono-sm text-ink-dim",
    action:
      "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xs " +
      "text-ink-dim outline-none transition-colors duration-fast ease-out " +
      "hover:bg-surface-03 hover:text-event-red " +
      "focus-visible:outline focus-visible:outline-1 focus-visible:outline-ember",
  },
});

export interface SidebarUserCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  /** Explicit initials override. */
  initials?: string;
  /** Called when the user presses the sign-out action. */
  onSignOut?: () => void;
  /** Custom trailing action (overrides the default sign-out button). */
  trailing?: React.ReactNode;
}

export function SidebarUserCard({
  name,
  email,
  avatarUrl,
  initials,
  onSignOut,
  trailing,
  className,
  ...props
}: SidebarUserCardProps) {
  const slots = React.useMemo(() => userCardStyles(), []);
  return (
    <div
      data-slot="sidebar-user-card"
      className={slots.root({ className })}
      {...props}
    >
      <div className={slots.identity()}>
        <Avatar
          size="sm"
          src={avatarUrl}
          name={name ?? undefined}
          initials={initials}
          alt={name ? `${name} avatar` : ""}
        />
        <div className={slots.text()}>
          {name ? <p className={slots.name()}>{name}</p> : null}
          {email ? <p className={slots.email()}>{email}</p> : null}
        </div>
      </div>

      {trailing ?? (
        onSignOut ? (
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out"
            title="Sign out"
            className={slots.action()}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
              />
            </svg>
          </button>
        ) : null
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Namespaced exports
// ─────────────────────────────────────────────────────────────
// Both forms are supported for ergonomics:
//   import { Sidebar, SidebarHeader } from 'ui';
//   <Sidebar><SidebarHeader /></Sidebar>
//
//   import { Sidebar } from 'ui';
//   <Sidebar><Sidebar.Header /></Sidebar>
//
// The dot-namespaced form mirrors the HeroUI v3 Dropdown pattern.

interface SidebarNamespace {
  (props: SidebarProps): React.ReactElement;
  Header: typeof SidebarHeader;
  Status: typeof SidebarStatus;
  Nav: typeof SidebarNav;
  NavSection: typeof SidebarNavSection;
  NavItem: typeof SidebarNavItem;
  Meta: typeof SidebarMeta;
  Footer: typeof SidebarFooter;
  UserCard: typeof SidebarUserCard;
}

const Sidebar = SidebarRoot as SidebarNamespace;
Sidebar.Header = SidebarHeader;
Sidebar.Status = SidebarStatus;
Sidebar.Nav = SidebarNav;
Sidebar.NavSection = SidebarNavSection;
Sidebar.NavItem = SidebarNavItem;
Sidebar.Meta = SidebarMeta;
Sidebar.Footer = SidebarFooter;
Sidebar.UserCard = SidebarUserCard;

export { Sidebar };


import { cva } from "class-variance-authority";

export const breadcrumbsVariants = cva("flex items-center", {
  variants: {
    density: {
      brand:
        "gap-s-2 font-mono text-mono uppercase tracking-tactical text-ink-lo",
      compact: "gap-[6px] font-sans text-[12px] font-medium text-l-ink-lo",
    },
  },
  defaultVariants: {
    density: "brand",
  },
});

export const breadcrumbItemVariants = cva(
  "flex items-center last:after:hidden",
  {
    variants: {
      density: {
        brand:
          "gap-s-2 after:content-['/'] after:text-ink-dim after:mx-s-1 data-[current=true]:text-ink-hi",
        compact:
          "gap-[6px] after:content-['/'] after:text-l-ink-dim after:mx-[2px] data-[current=true]:text-l-ink",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

export const breadcrumbLinkVariants = cva(
  "outline-none transition-colors duration-fast ease-out data-[focus-visible=true]:outline data-[focus-visible=true]:outline-1 data-[focus-visible=true]:outline-ember",
  {
    variants: {
      density: {
        brand: "text-ink-dim data-[hovered=true]:text-ink-hi",
        compact: "text-l-ink-dim data-[hovered=true]:text-l-ink",
      },
    },
    defaultVariants: {
      density: "brand",
    },
  }
);

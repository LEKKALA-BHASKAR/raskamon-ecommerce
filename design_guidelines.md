{
  "brand": {
    "name": "Sattva",
    "positioning": [
      "premium",
      "earthy-luxury",
      "Indian wellness ritual",
      "clinical-grade trust (without feeling sterile)",
      "quiet confidence"
    ],
    "north_star": "Make every interaction feel like a high-end boutique consultation: calm, spacious, tactile, and precise. Cream paper base + forest green authority + warm gold highlights."
  },
  "design_tokens": {
    "notes": [
      "Tokens MUST respect provided brand colors. We can introduce supporting tints/shades derived from them (mix with cream/black) for UI states.",
      "NO transparent backgrounds for surfaces (cards, drawers, dropdowns). Use solid cream/white or deep green surfaces.",
      "Gradients are allowed only as subtle decorative section backgrounds and must not exceed 20% viewport. Avoid saturated combos."
    ],
    "css_custom_properties": {
      "path": "/app/frontend/src/index.css",
      "light": {
        "--background": "36 33% 97%",
        "--foreground": "0 0% 11%",
        "--card": "36 33% 98%",
        "--card-foreground": "0 0% 11%",
        "--popover": "36 33% 98%",
        "--popover-foreground": "0 0% 11%",
        "--primary": "168 40% 17%",
        "--primary-foreground": "36 33% 97%",
        "--secondary": "39 44% 61%",
        "--secondary-foreground": "168 40% 12%",
        "--muted": "36 18% 92%",
        "--muted-foreground": "24 6% 34%",
        "--accent": "36 22% 90%",
        "--accent-foreground": "168 40% 14%",
        "--destructive": "0 72% 52%",
        "--destructive-foreground": "36 33% 97%",
        "--border": "36 14% 86%",
        "--input": "36 14% 86%",
        "--ring": "168 40% 17%",
        "--radius": "0.75rem",
        "--chart-1": "168 40% 17%",
        "--chart-2": "39 44% 61%",
        "--chart-3": "24 6% 34%",
        "--chart-4": "36 18% 92%",
        "--chart-5": "0 0% 11%",
        "--sattva-cream": "#FAF8F5",
        "--sattva-ink": "#1C1C1C",
        "--sattva-forest": "#1A3C34",
        "--sattva-gold": "#C8A96E",
        "--sattva-surface": "#FFFDF9",
        "--sattva-border": "#E7DED2",
        "--sattva-muted": "#F2ECE4",
        "--sattva-success": "#1F6B57",
        "--sattva-warning": "#B07A2A",
        "--sattva-danger": "#B42318",
        "--shadow-sm": "0 1px 0 rgba(26, 60, 52, 0.06), 0 8px 24px rgba(26, 60, 52, 0.08)",
        "--shadow-md": "0 2px 0 rgba(26, 60, 52, 0.08), 0 18px 50px rgba(26, 60, 52, 0.12)",
        "--shadow-inset": "inset 0 1px 0 rgba(255, 255, 255, 0.7)",
        "--focus-ring": "0 0 0 3px rgba(200, 169, 110, 0.35)",
        "--noise-opacity": "0.06"
      },
      "dark": {
        "--background": "168 40% 10%",
        "--foreground": "36 33% 97%",
        "--card": "168 40% 12%",
        "--card-foreground": "36 33% 97%",
        "--popover": "168 40% 12%",
        "--popover-foreground": "36 33% 97%",
        "--primary": "39 44% 61%",
        "--primary-foreground": "168 40% 10%",
        "--secondary": "168 22% 18%",
        "--secondary-foreground": "36 33% 97%",
        "--muted": "168 18% 16%",
        "--muted-foreground": "36 10% 78%",
        "--accent": "168 18% 16%",
        "--accent-foreground": "36 33% 97%",
        "--border": "168 18% 20%",
        "--input": "168 18% 20%",
        "--ring": "39 44% 61%",
        "--radius": "0.75rem"
      }
    },
    "tailwind_usage_rules": {
      "surfaces": [
        "Use bg-[var(--sattva-cream)] for page background.",
        "Use bg-[var(--sattva-surface)] for cards and drawers.",
        "Use bg-[var(--sattva-forest)] only for hero bands, primary buttons, and dark sections (no gradients)."
      ],
      "borders": [
        "Default border: border-[color:var(--sattva-border)]",
        "Focus ring: focus-visible:ring-2 focus-visible:ring-[color:var(--sattva-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--sattva-cream)]"
      ]
    },
    "texture": {
      "approach": "Cream paper + subtle grain overlay (CSS-only) to avoid flatness.",
      "css_snippet": "/* add to index.css */\n.bg-sattva-paper {\n  background-color: var(--sattva-cream);\n  background-image:\n    radial-gradient(circle at 1px 1px, rgba(26,60,52,var(--noise-opacity)) 1px, transparent 0);\n  background-size: 18px 18px;\n}\n/* optional: apply only to large sections */"
    },
    "allowed_gradients": {
      "rule": "Decorative only; max 20% viewport; never on cards or text-heavy areas.",
      "examples": [
        "background: linear-gradient(135deg, #FAF8F5 0%, #F2ECE4 55%, #FAF8F5 100%);",
        "background: linear-gradient(90deg, rgba(200,169,110,0.10) 0%, rgba(26,60,52,0.06) 55%, rgba(200,169,110,0.08) 100%);"
      ]
    }
  },
  "typography": {
    "fonts": {
      "heading": {
        "family": "Noto Serif",
        "usage": "All H1/H2/H3, product names, editorial quotes, section titles.",
        "tailwind": "font-[\"Noto_Serif\"] tracking-[-0.01em]"
      },
      "body": {
        "family": "Manrope",
        "usage": "Body, UI labels, prices, filters, admin tables.",
        "tailwind": "font-[\"Manrope\"]"
      }
    },
    "scale": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl leading-[1.05]",
      "h2": "text-base md:text-lg leading-[1.5]",
      "h3": "text-xl md:text-2xl leading-[1.25]",
      "body": "text-sm md:text-base leading-[1.65]",
      "small": "text-xs md:text-sm leading-[1.5]",
      "price": "text-base md:text-lg tabular-nums"
    },
    "copy_rules": [
      "Use sentence case for UI labels (not ALL CAPS).",
      "Use short, ritual-like microcopy: “Add to ritual”, “Refill cart”, “Continue to payment”.",
      "Numbers: use tabular-nums for prices, totals, KPIs."
    ]
  },
  "layout": {
    "grid": {
      "container": "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
      "home_sections": "Use generous vertical rhythm: py-10 sm:py-14 lg:py-20",
      "plp": {
        "desktop": "12-col grid: 3 cols filters + 9 cols product grid",
        "mobile": "Filters in Drawer/Sheet; product grid 2 columns"
      },
      "admin": {
        "desktop": "Sidebar 260px + content; content max-w-[1400px]",
        "mobile": "Sidebar collapses into Sheet; top bar remains"
      }
    },
    "spacing": {
      "rule": "Use 2–3x more spacing than feels comfortable.",
      "tokens": {
        "section_gap": "gap-8 md:gap-10",
        "card_padding": "p-4 md:p-6",
        "form_gap": "gap-3 md:gap-4"
      }
    }
  },
  "components": {
    "component_path": {
      "shadcn_primary": "/app/frontend/src/components/ui",
      "must_use": [
        "button.jsx",
        "card.jsx",
        "badge.jsx",
        "navigation-menu.jsx",
        "sheet.jsx",
        "drawer.jsx",
        "dialog.jsx",
        "carousel.jsx",
        "tabs.jsx",
        "table.jsx",
        "pagination.jsx",
        "select.jsx",
        "checkbox.jsx",
        "radio-group.jsx",
        "slider.jsx",
        "accordion.jsx",
        "command.jsx",
        "sonner.jsx",
        "skeleton.jsx",
        "calendar.jsx",
        "breadcrumb.jsx",
        "tooltip.jsx"
      ]
    },
    "header": {
      "pattern": "Sticky, scroll-aware header with subtle elevation and shrink behavior.",
      "structure": [
        "Top utility bar (optional): shipping promise + store locator + support",
        "Main bar: logo left, nav center (NavigationMenu), search right, account + cart",
        "On scroll: reduce height, add border + shadow-sm"
      ],
      "classes": {
        "wrapper": "sticky top-0 z-50 bg-[var(--sattva-cream)] border-b border-[color:var(--sattva-border)]",
        "scrolled": "shadow-[var(--shadow-sm)]",
        "inner": "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center justify-between"
      },
      "micro_interactions": [
        "Scroll-aware shrink: animate height + logo scale using Framer Motion (no layout jump).",
        "Nav hover: underline grows from left (scaleX) in gold.",
        "Search focus: expands into a Command dialog on desktop; Sheet on mobile."
      ],
      "data_testids": {
        "header": "site-header",
        "search_button": "header-search-button",
        "account_button": "header-account-button",
        "cart_button": "header-cart-button",
        "nav_menu": "header-navigation-menu"
      }
    },
    "hero": {
      "pattern": "Full-width editorial carousel with product storytelling.",
      "use": "carousel.jsx + Framer Motion for slide transitions",
      "rules": [
        "Keep hero background mostly solid cream; allow a mild decorative gradient overlay behind imagery only.",
        "CTA buttons: Primary (forest) + Secondary (gold)."
      ],
      "skeleton": "Use skeleton.jsx for hero image and text while fetching banners.",
      "data_testids": {
        "hero": "home-hero",
        "hero_next": "home-hero-next",
        "hero_prev": "home-hero-prev",
        "hero_primary_cta": "home-hero-primary-cta"
      }
    },
    "product_cards": {
      "pattern": "Boutique card: image, ritual tag, name, price, rating, quick actions.",
      "card_surface": "bg-[var(--sattva-surface)] border border-[color:var(--sattva-border)] shadow-none hover:shadow-[var(--shadow-sm)]",
      "hover": [
        "Image: subtle zoom (scale 1.03) on hover (transition-transform only).",
        "Reveal: Quick add + wishlist icon row slides up 8px with opacity transition.",
        "Badge: gold outline for ‘Bestseller’ / ‘New’"
      ],
      "badges": {
        "bestseller": "bg-[var(--sattva-gold)] text-[color:var(--sattva-forest)]",
        "new": "bg-[var(--sattva-muted)] text-[color:var(--sattva-forest)] border border-[color:var(--sattva-border)]"
      },
      "data_testids": {
        "card": "product-card",
        "quick_add": "product-card-quick-add-button",
        "wishlist": "product-card-wishlist-button",
        "rating": "product-card-rating"
      }
    },
    "plp_filters": {
      "desktop": "Left sidebar using Accordion + Checkbox/Slider/RadioGroup; sticky within viewport.",
      "mobile": "Filters open in Sheet (sheet.jsx) with Apply/Reset fixed footer.",
      "selected_filters": "Show removable filter chips above grid (Badge + Button ghost).",
      "data_testids": {
        "open_filters": "plp-open-filters-button",
        "filters_sheet": "plp-filters-sheet",
        "apply_filters": "plp-apply-filters-button",
        "reset_filters": "plp-reset-filters-button",
        "sort_select": "plp-sort-select"
      }
    },
    "pdp_gallery": {
      "pattern": "Image gallery with thumbnails + zoom dialog.",
      "use": [
        "aspect-ratio.jsx for consistent media",
        "dialog.jsx for zoom",
        "carousel.jsx for mobile swipe"
      ],
      "variant_selector": "Use RadioGroup for size/scent; Select for dropdown variants.",
      "trust_blocks": "Ingredient highlights, certifications, shipping/returns in Accordion.",
      "data_testids": {
        "gallery": "pdp-image-gallery",
        "zoom": "pdp-image-zoom-button",
        "add_to_cart": "pdp-add-to-cart-button",
        "variant": "pdp-variant-selector"
      }
    },
    "cart_drawer": {
      "pattern": "Slide-over cart using Sheet (right side).",
      "rules": [
        "Solid surface (no transparency).",
        "Sticky footer with totals + checkout CTA.",
        "Inline quantity stepper (Button + Input)."
      ],
      "data_testids": {
        "open_cart": "cart-open-drawer-button",
        "cart_drawer": "cart-drawer",
        "checkout": "cart-checkout-button"
      }
    },
    "checkout": {
      "pattern": "3-step wizard: Address → Payment → Confirm.",
      "use": [
        "tabs.jsx OR custom stepper with Progress",
        "form.jsx + input.jsx + select.jsx",
        "radio-group.jsx for payment methods"
      ],
      "micro_interactions": [
        "Step transitions: slide + fade (Framer Motion) with reduced-motion fallback.",
        "Inline validation: show errors under fields; shake only the field group (not whole page)."
      ],
      "data_testids": {
        "stepper": "checkout-stepper",
        "address_form": "checkout-address-form",
        "payment_form": "checkout-payment-form",
        "place_order": "checkout-place-order-button"
      }
    },
    "account": {
      "pattern": "Dashboard with order timeline + wishlist + addresses.",
      "use": [
        "tabs.jsx for sections",
        "card.jsx for panels",
        "table.jsx for orders",
        "badge.jsx for status"
      ],
      "order_timeline": "Use vertical list with status dots (forest/gold) and dates in muted text.",
      "data_testids": {
        "account_tabs": "account-tabs",
        "orders_table": "account-orders-table",
        "wishlist_grid": "account-wishlist-grid"
      }
    },
    "search": {
      "pattern": "Instant suggestions with Command component.",
      "desktop": "Command dialog opens from header search; includes recent searches + categories + products.",
      "mobile": "Sheet with Command inside.",
      "data_testids": {
        "search_command": "search-command",
        "search_input": "search-input",
        "search_suggestion": "search-suggestion-item"
      }
    },
    "reviews": {
      "pattern": "Star rating + review list + write review dialog.",
      "use": [
        "dialog.jsx for write review",
        "textarea.jsx",
        "select.jsx for rating if not using custom stars"
      ],
      "stars": "Implement stars with lucide-react icons; fill gold for active.",
      "data_testids": {
        "reviews_section": "pdp-reviews-section",
        "write_review": "pdp-write-review-button",
        "review_submit": "review-submit-button"
      }
    },
    "admin": {
      "visual": "Same brand DNA but more utilitarian: cream background, white cards, forest accents, gold highlights for important KPIs.",
      "sidebar": "NavigationMenu or custom list; collapses into Sheet on mobile.",
      "kpis": "Card grid with tabular numbers; small sparkline area (Recharts).",
      "tables": "table.jsx with sticky header; row hover uses muted background.",
      "forms": "form.jsx with clear sections; use Separator between groups.",
      "charts": {
        "library": "recharts",
        "use_cases": [
          "Revenue over time (AreaChart)",
          "Orders by status (BarChart)",
          "Top categories (Horizontal Bar)",
          "Conversion funnel (custom stacked bar)"
        ]
      },
      "data_testids": {
        "admin_sidebar": "admin-sidebar",
        "admin_kpi_card": "admin-kpi-card",
        "admin_products_table": "admin-products-table",
        "admin_orders_table": "admin-orders-table"
      }
    },
    "whatsapp": {
      "pattern": "Floating WhatsApp bubble bottom-right.",
      "rules": [
        "Use solid gold circle with forest icon; subtle shadow.",
        "On hover: lift 2px + shadow-md.",
        "On click: open external wa.me link in new tab."
      ],
      "data_testids": {
        "whatsapp_fab": "whatsapp-floating-button"
      }
    },
    "toasts_and_loading": {
      "toasts": {
        "library": "sonner",
        "component": "/app/frontend/src/components/ui/sonner.jsx",
        "style": "Cream surface, forest title, gold accent bar on left.",
        "data_testids": {
          "toast": "app-toast"
        }
      },
      "skeletons": {
        "component": "/app/frontend/src/components/ui/skeleton.jsx",
        "rule": "Every data-fetching component must have skeleton state: PLP grid, PDP gallery, cart drawer, account orders, admin tables/charts."
      }
    }
  },
  "motion": {
    "library": "framer-motion",
    "principles": [
      "Use motion to communicate hierarchy: entrances are subtle, exits are faster.",
      "Prefer opacity + y (4–12px) transitions; avoid dramatic scaling.",
      "Respect prefers-reduced-motion: disable parallax and reduce durations."
    ],
    "durations": {
      "fast": "0.16s",
      "base": "0.24s",
      "slow": "0.38s"
    },
    "easing": {
      "standard": "[0.22, 1, 0.36, 1]",
      "exit": "[0.4, 0, 1, 1]"
    },
    "recipes": {
      "section_enter": "initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38, ease: [0.22,1,0.36,1] }}",
      "button_press": "whileTap={{ scale: 0.98 }}",
      "drawer": "Animate overlay opacity; panel slides x from 24px"
    }
  },
  "accessibility": {
    "requirements": [
      "WCAG AA contrast: forest text on cream; cream text on forest.",
      "Visible focus states on all interactive elements (gold ring).",
      "Keyboard navigation: NavigationMenu, Command search, dialogs, sheets.",
      "Use aria-labels for icon-only buttons (wishlist, cart, WhatsApp).",
      "Reduced motion support via prefers-reduced-motion."
    ]
  },
  "testing": {
    "data_testid_rule": "All interactive and key informational elements MUST include data-testid in kebab-case describing role.",
    "examples": [
      "data-testid=\"plp-sort-select\"",
      "data-testid=\"checkout-place-order-button\"",
      "data-testid=\"admin-products-table\"",
      "data-testid=\"product-price\""
    ]
  },
  "image_urls": {
    "hero_banner": [
      {
        "url": "https://images.unsplash.com/photo-1621658537360-dfcb008fe19f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjd8MHwxfHNlYXJjaHwxfHxwcmVtaXVtJTIwaW5kaWFuJTIwd2VsbG5lc3MlMjBsaWZlc3R5bGUlMjBwcm9kdWN0JTIwZmxhdGxheSUyMGNyZWFtJTIwYmFja2dyb3VuZHxlbnwwfHx8Z3JlZW58MTc3NzU0MjUwNnww&ixlib=rb-4.1.0&q=85",
        "description": "Premium wellness product flatlay; use as hero slide background with cream overlay and headline on left.",
        "category": "home-hero"
      }
    ],
    "category_tiles": [
      {
        "url": "https://images.pexels.com/photos/20689437/pexels-photo-20689437.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "description": "Ayurveda ingredients flatlay; use for category tile (Rituals / Ingredients / Pantry).",
        "category": "home-featured-categories"
      },
      {
        "url": "https://images.unsplash.com/photo-1606441393961-bb2331b77d55?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjd8MHwxfHNlYXJjaHw0fHxwcmVtaXVtJTIwaW5kaWFuJTIwd2VsbG5lc3MlMjBsaWZlc3R5bGUlMjBwcm9kdWN0JTIwZmxhdGxheSUyMGNyZWFtJTIwYmFja2dyb3VuZHxlbnwwfHx8Z3JlZW58MTc3NzU0MjUwNnww&ixlib=rb-4.1.0&q=85",
        "description": "Botanical leaf macro; use as subtle category background or blog hero.",
        "category": "blog-and-category"
      }
    ],
    "product_placeholders": [
      {
        "url": "https://images.unsplash.com/photo-1625848257931-4a421f5818ab?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjd8MHwxfHNlYXJjaHwzfHxwcmVtaXVtJTIwaW5kaWFuJTIwd2VsbG5lc3MlMjBsaWZlc3R5bGUlMjBwcm9kdWN0JTIwZmxhdGxheSUyMGNyZWFtJTIwYmFja2dyb3VuZHxlbnwwfHx8Z3JlZW58MTc3NzU0MjUwNnww&ixlib=rb-4.1.0&q=85",
        "description": "Skincare tube with botanicals; use as placeholder product image in dev.",
        "category": "product"
      }
    ]
  },
  "libraries": {
    "required": [
      {
        "name": "framer-motion",
        "why": "Hero slider, scroll-aware header, page transitions, micro-interactions.",
        "install": "npm i framer-motion"
      },
      {
        "name": "recharts",
        "why": "Admin analytics charts.",
        "install": "npm i recharts"
      },
      {
        "name": "lucide-react",
        "why": "Icons (no emoji icons).",
        "install": "npm i lucide-react"
      }
    ],
    "optional": [
      {
        "name": "embla-carousel-react",
        "why": "If shadcn carousel requires it; improves touch feel.",
        "install": "npm i embla-carousel-react"
      }
    ]
  },
  "instructions_to_main_agent": {
    "global": [
      "Update /app/frontend/src/index.css :root and .dark tokens to match Sattva palette (forest/gold/cream).",
      "Remove default CRA App.css centering patterns; do not center align app container.",
      "Implement a global Layout with sticky scroll-aware header + footer.",
      "Use shadcn/ui components from /app/frontend/src/components/ui only for dropdowns, dialogs, sheets, etc.",
      "Every interactive element and key info must include data-testid.",
      "No transparent backgrounds for surfaces; use solid cream/white/forest.",
      "Add skeleton states everywhere data is fetched.",
      "Use Sonner for toasts for all user actions (add to cart, wishlist, save address, admin CRUD)."
    ],
    "page_skeletons": {
      "home": [
        "Hero Carousel (motion + shadcn carousel)",
        "Featured categories grid (bento-like, 2x2 on mobile, 4 across on desktop)",
        "Featured products (horizontal scroll on mobile, grid on desktop)",
        "Editorial ritual section (image left, copy right)",
        "Testimonials (cards)",
        "Blog preview"
      ],
      "plp": [
        "Breadcrumb + title + result count",
        "Filter sidebar (desktop) / filter sheet (mobile)",
        "Sort select",
        "Product grid + pagination"
      ],
      "pdp": [
        "Gallery + zoom",
        "Title, price, rating, variant selector",
        "Add to cart + buy now",
        "Accordions: ingredients, how to use, shipping/returns",
        "Reviews"
      ],
      "admin": [
        "Sidebar + top bar",
        "KPI cards",
        "Charts row",
        "Tables for products/orders"
      ]
    }
  },
  "general_ui_ux_design_guidelines": "\n    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.\n"
}

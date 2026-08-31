/**
 * @fleet/design-tokens — Tailwind v3 preset.
 *
 * Maps utility names onto the CSS custom properties defined in tokens.css.
 * Every value here resolves to a var — never a literal. That is the whole
 * point: retheming edits tokens.css, and nothing in any app changes.
 *
 * Usage (tailwind.config.js):
 *   module.exports = {
 *     presets: [require('@fleet/design-tokens/tailwind-preset')],
 *     content: [...],
 *   }
 *
 * Tailwind v4 apps (FleetCrown) consume tokens.css directly via @theme instead;
 * the variable names are identical, so the two paths stay in sync.
 */

// HSL channel triplets, so `bg-surface-raised/50` composes alpha correctly.
/**
 * @param {string} token CSS custom property name, e.g. `--text-primary`.
 * @returns {string} Tailwind colour value carrying the alpha placeholder.
 */
const withAlpha = (token) => `hsl(var(${token}) / <alpha-value>)`;

module.exports = {
  theme: {
    extend: {
      colors: {
        fg: {
          primary: withAlpha('--text-primary'),
          secondary: withAlpha('--text-secondary'),
          tertiary: withAlpha('--text-tertiary'),
          muted: withAlpha('--text-muted'),
          inverted: withAlpha('--text-inverted'),
        },
        surface: {
          public: withAlpha('--surface-public'),
          page: withAlpha('--surface-page'),
          base: withAlpha('--surface-base'),
          raised: withAlpha('--surface-raised'),
          overlay: withAlpha('--surface-overlay'),
          modal: withAlpha('--surface-modal'),
          drawer: withAlpha('--surface-drawer'),
          hover: withAlpha('--surface-hover'),
        },
        border: {
          subtle: withAlpha('--border-subtle'),
          DEFAULT: withAlpha('--border-default'),
          strong: withAlpha('--border-strong'),
          interactive: withAlpha('--border-interactive'),
        },
        // Lets components write `border-default` alongside `border-subtle`.
        default: withAlpha('--border-default'),
        accent: {
          DEFAULT: 'var(--public-accent)',
          hover: 'var(--accent-hover)',
          muted: 'hsl(var(--accent-muted))',
          text: 'hsl(var(--accent-text))',
        },
        // The label colour for text ON the accent. `bg-accent text-white` is
        // 3.10:1 and fails AA; `bg-accent text-on-accent` is 6.10:1. Paired
        // with the background it belongs to so nobody has to remember which
        // ink an orange button takes.
        'on-accent': withAlpha('--on-accent'),
        // Bitcoin's own orange — means "this is Bitcoin", never an action.
        bitcoin: 'var(--bitcoin-orange)',
        status: {
          positive: withAlpha('--status-positive'),
          warning: withAlpha('--status-warning'),
          negative: withAlpha('--status-negative'),
          neutral: withAlpha('--status-neutral'),
          // The -subtle tokens already carry their own alpha, so they are used
          // as-is rather than through withAlpha.
          'positive-subtle': 'hsl(var(--status-positive-subtle))',
          'warning-subtle': 'hsl(var(--status-warning-subtle))',
          'negative-subtle': 'hsl(var(--status-negative-subtle))',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)'],
        mono: ['var(--font-mono)'],
      },
      letterSpacing: {
        display: 'var(--tracking-display)',
        label: 'var(--tracking-label)',
        caps: 'var(--tracking-caps)',
      },
      borderRadius: {
        control: 'var(--radius-control)',
        surface: 'var(--radius-surface)',
        pill: 'var(--radius-pill)',
      },
      fontSize: {
        // Fluid display sizes. Line heights ride with them so a headline never
        // needs a per-breakpoint leading override.
        'display-1': ['var(--text-display-1)', { lineHeight: '1.04' }],
        'display-2': ['var(--text-display-2)', { lineHeight: '1.12' }],
        'display-3': ['var(--text-display-3)', { lineHeight: '1.2' }],
      },
      maxWidth: {
        shell: 'var(--shell-max)',
        lede: 'var(--measure-lede)',
        copy: 'var(--measure-copy)',
      },
      spacing: {
        nav: 'var(--public-nav-height)',
        section: 'var(--section-py)',
        'section-tight': 'var(--section-py-tight)',
      },
    },
  },
};

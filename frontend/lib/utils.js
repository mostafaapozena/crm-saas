/**
 * Format a number as currency (compact notation)
 */
export const fmtCurrency = (n, compact = true) =>
  n != null
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: compact ? 'compact' : 'standard',
        maximumFractionDigits: compact ? 1 : 2,
      }).format(n)
    : '—'

/**
 * Format a date string to readable format
 */
export const fmtDate = (d, opts = {}) =>
  d
    ? new Date(d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        ...opts,
      })
    : '—'

/**
 * Truncate a string to a max length
 */
export const truncate = (str, max = 30) =>
  str && str.length > max ? str.slice(0, max) + '…' : str || '—'

/**
 * Get initials from a name
 */
export const initials = (name = '') =>
  name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

/**
 * Lead stage display labels
 */
export const STAGE_LABELS = {
  LEAD: 'Lead',
  QUALIFIED: 'Qualified',
  PROPOSAL_SENT: 'Proposal Sent',
  NEGOTIATION: 'Negotiation',
  WON: 'Won',
  LOST: 'Lost',
}

/**
 * Deal status display labels
 */
export const STATUS_LABELS = {
  ACTIVE: 'Active',
  WON: 'Won',
  LOST: 'Lost',
  ON_HOLD: 'On Hold',
}

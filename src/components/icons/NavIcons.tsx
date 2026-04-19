const iconProps = { width: 20, height: 20, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 }

export function BellIcon() {
  return (
    <svg {...iconProps}>
      <path d="M10 17C10.8 17 11.5 16.3 11.5 15.5H8.5C8.5 16.3 9.2 17 10 17Z" />
      <path d="M15 13V9C15 6.2 13.2 3.8 10.5 3.2V2.5C10.5 2.2 10.3 2 10 2C9.7 2 9.5 2.2 9.5 2.5V3.2C6.8 3.8 5 6.2 5 9V13L3.5 14.5V15H16.5V14.5L15 13Z" />
    </svg>
  )
}

export function DashboardIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="3" width="6" height="6" rx="1.5" />
      <rect x="11" y="3" width="6" height="6" rx="1.5" />
      <rect x="3" y="11" width="6" height="6" rx="1.5" />
      <rect x="11" y="11" width="6" height="6" rx="1.5" />
    </svg>
  )
}

export function OrganizationIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="4" width="14" height="12" rx="2" />
      <path d="M7 4V2M13 4V2" />
    </svg>
  )
}

export function ProfileIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="10" cy="8" r="4" />
      <path d="M3 18C3 14 6 11 10 11C14 11 17 14 17 18" />
    </svg>
  )
}

export function MembersIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="10" cy="7" r="3" />
      <path d="M4 17C4 13.7 6.7 11 10 11C13.3 11 16 13.7 16 17" />
    </svg>
  )
}

export function ClientsIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 10C3 6.1 6.1 3 10 3C13.9 3 17 6.1 17 10C17 13.9 13.9 17 10 17C6.1 17 3 13.9 3 10Z" />
      <path d="M10 7V10L12.5 12.5" />
    </svg>
  )
}

export function FrameworksIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 5H16M4 10H16M4 15H10" />
    </svg>
  )
}

export function MissionsIcon() {
  return (
    <svg {...iconProps}>
      <path d="M10 3L17 7V13L10 17L3 13V7L10 3Z" />
    </svg>
  )
}

export function SettingsIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="10" cy="10" r="3" />
      <path d="M10 3V4.5M10 15.5V17M3 10H4.5M15.5 10H17M5.05 5.05L6.1 6.1M13.9 13.9L14.95 14.95M5.05 14.95L6.1 13.9M13.9 6.1L14.95 5.05" />
    </svg>
  )
}

export function LogoutIcon() {
  return (
    <svg {...iconProps}>
      <path d="M8 17H4C3.4 17 3 16.6 3 16V4C3 3.4 3.4 3 4 3H8" />
      <path d="M13 14L17 10L13 6" />
      <path d="M17 10H7" />
    </svg>
  )
}

export function ChevronUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M4 9L7 6L10 9" />
    </svg>
  )
}

export function CollapseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M10 4L6 8L10 12" />
    </svg>
  )
}

export function ExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M6 4L10 8L6 12" />
    </svg>
  )
}

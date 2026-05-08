export type HomeIcon = 'home' | 'heart' | 'history' | 'team' | 'library'

export interface HomeNavItem {
  label: string
  icon: HomeIcon
  active?: boolean
}

export interface ShortcutItem {
  label: string
  icon: HomeIcon
  active?: boolean
}

export interface StudyCardData {
  title: string
  subtitle: string
  coverClass: string
  badges: string[]
}

export interface MeetingRowData {
  time: string
  date?: string
  status: string
  statusTone: 'live' | 'upcoming'
  badge?: string
  title: string
  meetingCode: string
  meta?: string
  highlighted?: boolean
  joinable?: boolean
  showMore?: boolean
}

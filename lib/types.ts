// ============================================
// Telegram Types
// ============================================
export interface TelegramUser {
	id: number
	first_name: string
	last_name?: string
	username?: string
	photo_url?: string
	language_code?: string
}

export interface TelegramWebApp {
	initData: string
	initDataUnsafe: {
		user?: TelegramUser
		chat_instance?: string
		chat_type?: string
		start_param?: string
		auth_date: number
		hash: string
	}
	version: string
	platform: string
	colorScheme: 'light' | 'dark'
	themeParams: {
		bg_color?: string
		text_color?: string
		hint_color?: string
		link_color?: string
		button_color?: string
		button_text_color?: string
		secondary_bg_color?: string
		header_bg_color?: string
		bottom_bar_bg_color?: string
		accent_text_color?: string
		section_bg_color?: string
		section_header_text_color?: string
		subtitle_text_color?: string
		destructive_text_color?: string
	}
	isExpanded: boolean
	viewportHeight: number
	viewportStableHeight: number
	isClosingConfirmationEnabled: boolean
	BackButton: {
		isVisible: boolean
		onClick(cb: () => void): void
		offClick(cb: () => void): void
		show(): void
		hide(): void
	}
	MainButton: {
		text: string
		color: string
		textColor: string
		isVisible: boolean
		isProgressVisible: boolean
		isActive: boolean
		setText(text: string): void
		onClick(cb: () => void): void
		offClick(cb: () => void): void
		show(): void
		hide(): void
		enable(): void
		disable(): void
		showProgress(leaveActive?: boolean): void
		hideProgress(): void
	}
	HapticFeedback: {
		impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void
		notificationOccurred(type: 'error' | 'success' | 'warning'): void
		selectionChanged(): void
	}
	close(): void
	expand(): void
	ready(): void
	sendData(data: string): void
	openLink(url: string): void
	showPopup(
		params: {
			title?: string
			message: string
			buttons?: Array<{
				id?: string
				type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive'
				text?: string
			}>
		},
		callback?: (buttonId: string) => void,
	): void
	showAlert(message: string, callback?: () => void): void
	showConfirm(message: string, callback?: (confirmed: boolean) => void): void
}

// ============================================
// App Domain Types
// ============================================
export type UserRole = 'superadmin' | 'admin' | 'teacher' | 'student'

export type AttendanceStatus = 'present' | 'absent' | 'late'

export interface User {
	id: number
	telegram_id: number
	first_name: string
	last_name: string
	phone?: string
	role: UserRole
	photo_url?: string
}

export interface Group {
	id: number
	name: string
	teacher_id: number
	teacher_name?: string
	teacher?: User // Populated teacher object
	description?: string
	course_name?: string
	level?: string
	schedule_days?: string // "1,3,5" format
	class_time?: string // "10:00" format
	max_students?: number
	student_count?: number
	is_active: boolean

	// Timestamps
	created_at: string
	updated_at?: string
}
export interface GroupResponse extends Group {}

export interface GroupListResponse {
	items: Group[]
	total: number
	page: number
	size: number
	pages: number
}
export interface Student {
	id: number
	user_id: number
	group_id: number
	// Student Info
	student_id?: string // "STU-2024-001" format
	first_name: string
	last_name: string
	full_name: string
	// Contact
	username?: string
	phone?: string
	telegram_id: number
	// Group
	group_name?: string
	// Parent Info
	parent_name?: string
	parent_phone?: string
	// Dates
	enrollment_date: string // ISO date
	// Status
	is_active: boolean
	// Computed
	days_enrolled?: number // Calculated in backend
	// Timestamps
	created_at: string
	updated_at?: string
	user: User
	group?: Group
}
export interface AttendanceRecord {
	id: number
	date: string // ISO date
	student_id: number
	student?: Student
	status: AttendanceStatus
	teacher_id: number
	note?: string
}

export interface DailyAttendance {
	group_id: number
	group: Group
	date: string
	records: AttendanceRecord[]
}

export interface AttendanceStats {
	total_days: number
	present: number
	absent: number
	late: number
	percentage: number
}

// ============================================
// API Response Types
// ============================================
export interface AuthResponse {
	access_token: string
	token_type: string
	user: User
}

export interface ApiError {
	detail: string
	status_code: number
}

export interface PaginatedResponse<T> {
	items: T[]
	total: number
	page: number
	size: number
}

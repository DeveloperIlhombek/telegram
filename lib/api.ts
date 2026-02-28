import {
	AttendanceRecord,
	AttendanceStats,
	AuthResponse,
	Group,
	PaginatedResponse,
	PaymentStatus,
	Student,
	StudentStatus,
	User,
} from './types'

const API_BASE =
	`${process.env.NEXT_PUBLIC_API_URL}/api/v1` ||
	'https://helminthoid-clumsily-xuan.ngrok-free.dev/api/v1'

// ============================================
// SSR-safe localStorage helper
// ============================================
const storage = {
	get: (key: string): string | null => {
		if (typeof window === 'undefined') return null
		try {
			return localStorage.getItem(key)
		} catch {
			return null
		}
	},
	set: (key: string, value: string): void => {
		if (typeof window === 'undefined') return
		try {
			localStorage.setItem(key, value)
		} catch {
			/* ignore */
		}
	},
	remove: (key: string): void => {
		if (typeof window === 'undefined') return
		try {
			localStorage.removeItem(key)
		} catch {
			/* ignore */
		}
	},
}

class ApiClient {
	private token: string | null = null

	setToken(token: string) {
		this.token = token
		storage.set('auth_token', token)
	}

	getToken(): string | null {
		if (!this.token) this.token = storage.get('auth_token')
		return this.token
	}

	clearToken() {
		this.token = null
		storage.remove('auth_token')
		storage.remove('auth_user')
	}

	private async request<T>(
		path: string,
		options: RequestInit = {},
	): Promise<T> {
		const token = this.getToken()
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			'ngrok-skip-browser-warning': 'true',
			...(options.headers as Record<string, string>),
		}
		if (token) headers['Authorization'] = `Bearer ${token}`

		const response = await fetch(`${API_BASE}${path}`, { ...options, headers })

		if (!response.ok) {
			const error = await response
				.json()
				.catch(() => ({ detail: 'Server xatosi' }))
			throw new Error(error.detail || `HTTP ${response.status}`)
		}

		if (response.status === 204) return {} as T
		return response.json()
	}

	get<T>(path: string) {
		return this.request<T>(path, { method: 'GET' })
	}
	post<T>(path: string, body?: unknown) {
		return this.request<T>(path, {
			method: 'POST',
			body: body ? JSON.stringify(body) : undefined,
		})
	}
	put<T>(path: string, body?: unknown) {
		return this.request<T>(path, {
			method: 'PUT',
			body: body ? JSON.stringify(body) : undefined,
		})
	}
	patch<T>(path: string, body?: unknown) {
		return this.request<T>(path, {
			method: 'PATCH',
			body: body ? JSON.stringify(body) : undefined,
		})
	}
	delete<T>(path: string) {
		return this.request<T>(path, { method: 'DELETE' })
	}
}

export const api = new ApiClient()

// ============================================
// Auth API
// ============================================
export const authApi = {
	loginWithTelegram: (initData: string) =>
		api.post<AuthResponse>('/auth/telegram', { init_data: initData }),
}

// ============================================
// Teacher API
// ============================================
export const teacherApi = {
	getMyGroups: () => api.get<Group[]>('/teacher/groups'),
	getGroupStudents: (groupId: number) =>
		api.get<Student[]>(`/teacher/groups/${groupId}/students`),
	submitAttendance: (
		groupId: number,
		date: string,
		records: { student_id: number; status: string; note?: string }[],
	) =>
		api.post<void>(`/teacher/attendance`, { group_id: groupId, date, records }),
	getAttendanceHistory: (groupId?: number, page = 1, size = 20) =>
		api.get<PaginatedResponse<AttendanceRecord>>(
			`/teacher/attendance/history?${groupId ? `group_id=${groupId}&` : ''}page=${page}&size=${size}`,
		),
	checkTodayAttendance: (groupId: number, date: string) =>
		api.get<AttendanceRecord[] | null>(
			`/teacher/attendance/check?group_id=${groupId}&date=${date}`,
		),
}

// ============================================
// Student API
// ============================================
export const studentApi = {
	getMyAttendance: (page = 1, size = 30) =>
		api.get<PaginatedResponse<AttendanceRecord>>(
			`/student/attendance?page=${page}&size=${size}`,
		),
	getMyStats: () => api.get<AttendanceStats>('/student/attendance/stats'),
	getMyGroup: () => api.get<Group>('/student/group'),
}

// ============================================
// Admin API
// ============================================

// Student create/update request types
export interface StudentCreateData {
	telegram_id: number
	first_name: string
	last_name: string
	username?: string
	phone?: string
	group_id?: number
	parent_name?: string
	parent_phone?: string
	emergency_contact?: string
	address?: string
	notes?: string
	enrollment_date?: string
	monthly_fee?: number
	discount_percent?: number
}

export interface StudentUpdateData {
	first_name?: string
	last_name?: string
	phone?: string
	group_id?: number | null
	parent_name?: string
	parent_phone?: string
	emergency_contact?: string
	address?: string
	notes?: string
	monthly_fee?: number
	discount_percent?: number
	payment_status?: PaymentStatus
	last_payment_date?: string
	debt_amount?: number
	status?: StudentStatus
	is_active?: boolean
}

export const adminApi = {
	// ── Teachers ────────────────────────────────
	getTeachers: (page = 1, size = 20) =>
		api.get<PaginatedResponse<User>>(
			`/admin/teachers?page=${page}&size=${size}`,
		),
	createTeacher: (data: {
		telegram_id: number
		first_name: string
		last_name: string
		phone?: string
		username?: string
		specialization?: string
		experience_years?: number
		bio?: string
		salary?: number
	}) => api.post<User>('/admin/teachers', data),
	updateTeacher: (id: number, data: Partial<User>) =>
		api.put<User>(`/admin/teachers/${id}`, data),
	deleteTeacher: (id: number) => api.delete<void>(`/admin/teachers/${id}`),

	// ── Students ────────────────────────────────
	getStudents: (params?: {
		page?: number
		size?: number
		group_id?: number
		status?: StudentStatus
		payment_status?: PaymentStatus
		search?: string
	}) => {
		const p = params || {}
		const query = new URLSearchParams()
		if (p.page) query.set('page', String(p.page))
		if (p.size) query.set('size', String(p.size))
		if (p.group_id) query.set('group_id', String(p.group_id))
		if (p.status) query.set('status', p.status)
		if (p.payment_status) query.set('payment_status', p.payment_status)
		if (p.search) query.set('search', p.search)
		return api.get<PaginatedResponse<Student>>(
			`/admin/students?${query.toString()}`,
		)
	},

	getStudent: (id: number) => api.get<Student>(`/admin/students/${id}`),

	createStudent: (data: StudentCreateData) =>
		api.post<Student>('/admin/students', data),

	updateStudent: (id: number, data: StudentUpdateData) =>
		api.put<Student>(`/admin/students/${id}`, data),

	assignGroup: (studentId: number, groupId: number) =>
		api.patch<Student>(`/admin/students/${studentId}/group`, {
			group_id: groupId,
		}),

	deleteStudent: (id: number) => api.delete<void>(`/admin/students/${id}`),

	getStudentAttendance: (studentId: number, page = 1, size = 30) =>
		api.get<PaginatedResponse<AttendanceRecord>>(
			`/admin/students/${studentId}/attendance?page=${page}&size=${size}`,
		),

	// ── Groups ────────────────────────────────
	getGroups: (page = 1, size = 20) =>
		api.get<PaginatedResponse<Group>>(
			`/admin/groups?page=${page}&size=${size}`,
		),
	createGroup: (data: {
		name: string
		teacher_id: number
		subject?: string
		schedule?: string
	}) => api.post<Group>('/admin/groups', data),
	updateGroup: (id: number, data: Partial<Group>) =>
		api.put<Group>(`/admin/groups/${id}`, data),
	deleteGroup: (id: number) => api.delete<void>(`/admin/groups/${id}`),

	// ── Stats ────────────────────────────────
	getStats: () =>
		api.get<{
			total_teachers: number
			total_students: number
			total_groups: number
			today_attendance_rate: number
		}>('/admin/stats'),
}

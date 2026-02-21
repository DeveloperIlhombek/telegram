import {
	AttendanceRecord,
	AttendanceStats,
	AuthResponse,
	Group,
	PaginatedResponse,
	Student,
	User,
} from './types'

const API_BASE =
	`${process.env.NEXT_PUBLIC_API_URL}/api/v1` ||
	'https://helminthoid-clumsily-xuan.ngrok-free.dev/api/v1'
//  1 |  5061144163 | Ilhomdeveloper  | Ilhom      | Toshqulov | +998771232115 | ADMIN   |
// ============================================
// SSR-safe localStorage helper
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
		if (!this.token) {
			this.token = storage.get('auth_token')
		}
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

		if (token) {
			headers['Authorization'] = `Bearer ${token}`
		}

		const response = await fetch(`${API_BASE}${path}`, {
			...options,
			headers,
		})

		if (!response.ok) {
			const error = await response.json().catch(() => ({
				detail: 'Server xatosi',
			}))
			throw new Error(error.detail || `HTTP ${response.status}`)
		}

		// Handle 204 No Content
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
		api.post<void>(`/teacher/attendance`, {
			group_id: groupId,
			date,
			records,
		}),

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
export const adminApi = {
	// Teachers
	getTeachers: (page = 1, size = 20) =>
		api.get<PaginatedResponse<User>>(
			`/admin/teachers?page=${page}&size=${size}`,
		),
	createTeacher: (data: {
		telegram_id: number
		first_name: string
		last_name: string
		phone?: string
	}) => api.post<User>('/admin/teachers', data),
	deleteTeacher: (id: number) => api.delete<void>(`/admin/teachers/${id}`),

	// Students
	getStudents: (groupId?: number, page = 1, size = 20) =>
		api.get<PaginatedResponse<Student>>(
			`/admin/students?${groupId ? `group_id=${groupId}&` : ''}page=${page}&size=${size}`,
		),
	createStudent: (data: {
		telegram_id: number
		first_name: string
		last_name: string
		phone?: string
		group_id: number
	}) => api.post<Student>('/admin/students', data),
	deleteStudent: (id: number) => api.delete<void>(`/admin/students/${id}`),

	// Groups
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

	// Stats
	getStats: () =>
		api.get<{
			total_teachers: number
			total_students: number
			total_groups: number
			today_attendance_rate: number
		}>('/admin/stats'),
}

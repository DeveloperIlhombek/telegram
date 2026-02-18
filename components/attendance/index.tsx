'use client'

import { getFullName, haptic } from '@/lib/telegram'
import { AttendanceStatus, Student } from '@/lib/types'

// ============================================
// Status Badge
// ============================================
const STATUS_CONFIG: Record<
	AttendanceStatus,
	{ label: string; emoji: string; className: string }
> = {
	present: { label: 'Keldi', emoji: '✓', className: 'active-present' },
	absent: { label: 'Kelmadi', emoji: '✗', className: 'active-absent' },
	late: { label: 'Kech', emoji: '⌚', className: 'active-late' },
}

export function StatusBadge({ status }: { status: AttendanceStatus }) {
	const config = STATUS_CONFIG[status]
	const colorMap = {
		present: 'var(--status-present)',
		absent: 'var(--status-absent)',
		late: 'var(--status-late)',
	}

	return (
		<span
			className='status-pill'
			style={{
				backgroundColor: `color-mix(in srgb, ${colorMap[status]} 15%, transparent)`,
				color: colorMap[status],
				border: `1px solid color-mix(in srgb, ${colorMap[status]} 40%, transparent)`,
			}}
		>
			{config.emoji} {config.label}
		</span>
	)
}

// ============================================
// Attendance Toggle Button Group
// ============================================
interface AttendanceToggleProps {
	studentId: number
	currentStatus: AttendanceStatus | null
	onStatusChange: (studentId: number, status: AttendanceStatus) => void
	disabled?: boolean
}

export function AttendanceToggle({
	studentId,
	currentStatus,
	onStatusChange,
	disabled = false,
}: AttendanceToggleProps) {
	const buttons: { status: AttendanceStatus; label: string; emoji: string }[] =
		[
			{ status: 'present', label: 'Keldi', emoji: '✓' },
			{ status: 'absent', label: 'Kelmadi', emoji: '✗' },
			{ status: 'late', label: 'Kech', emoji: '⌚' },
		]

	const handleClick = (status: AttendanceStatus) => {
		if (disabled) return
		haptic.select()
		onStatusChange(studentId, status)
	}

	return (
		<div className='attendance-toggle'>
			{buttons.map(({ status, label, emoji }) => {
				const isActive = currentStatus === status
				const activeClass = isActive ? `active-${status}` : ''
				return (
					<button
						key={status}
						className={`attendance-btn ${activeClass}`}
						onClick={() => handleClick(status)}
						disabled={disabled}
					>
						<span style={{ fontSize: '14px' }}>{emoji}</span>
						<br />
						<span>{label}</span>
					</button>
				)
			})}
		</div>
	)
}

// ============================================
// Student Attendance Card
// ============================================
interface StudentAttendanceCardProps {
	student: Student
	status: AttendanceStatus | null
	onStatusChange: (studentId: number, status: AttendanceStatus) => void
	index?: number
	disabled?: boolean
}

export function StudentAttendanceCard({
	student,
	status,
	onStatusChange,
	index = 0,
	disabled = false,
}: StudentAttendanceCardProps) {
	const name = getFullName(student.user)
	const initials = name
		.split(' ')
		.map(n => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)

	const statusColor = status
		? {
				present: 'var(--status-present)',
				absent: 'var(--status-absent)',
				late: 'var(--status-late)',
			}[status]
		: 'var(--tg-button)'

	return (
		<div
			style={{
				backgroundColor: 'var(--tg-section-bg)',
				borderBottom: '0.5px solid var(--tg-secondary-bg)',
				padding: '12px 16px',
				animationDelay: `${index * 30}ms`,
			}}
			className='page-enter'
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: '12px',
					marginBottom: '10px',
				}}
			>
				{/* Avatar */}
				<div className='avatar' style={{ background: statusColor }}>
					{student.user?.photo_url ? (
						<img src={student.user.photo_url} alt={name} />
					) : (
						initials
					)}
				</div>

				{/* Name and index */}
				<div style={{ flex: 1, minWidth: 0 }}>
					<p
						style={{
							fontSize: '15px',
							fontWeight: 600,
							color: 'var(--tg-text)',
							margin: 0,
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap',
						}}
					>
						{index + 1}. {name}
					</p>
					{student.user?.first_name && (
						<p
							style={{
								fontSize: '13px',
								color: 'var(--tg-hint)',
								margin: 0,
							}}
						>
							@{student.user.first_name}
						</p>
					)}
				</div>

				{/* Current status indicator */}
				{status && <StatusBadge status={status} />}
			</div>

			{/* Toggle */}
			<AttendanceToggle
				studentId={student.id}
				currentStatus={status}
				onStatusChange={onStatusChange}
				disabled={disabled}
			/>
		</div>
	)
}

// ============================================
// Attendance Summary Bar
// ============================================
interface AttendanceSummaryProps {
	present: number
	absent: number
	late: number
	total: number
}

export function AttendanceSummary({
	present,
	absent,
	late,
	total,
}: AttendanceSummaryProps) {
	const percentage = total > 0 ? Math.round((present / total) * 100) : 0

	return (
		<div
			style={{
				backgroundColor: 'var(--tg-bg)',
				padding: '12px 16px',
				borderBottom:
					'0.5px solid color-mix(in srgb, var(--tg-hint) 20%, transparent)',
				flexShrink: 0,
			}}
		>
			{/* Stats row */}
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(4, 1fr)',
					gap: '8px',
					marginBottom: '8px',
				}}
			>
				{[
					{ label: 'Jami', value: total, color: 'var(--tg-text)' },
					{ label: 'Keldi', value: present, color: 'var(--status-present)' },
					{ label: 'Kelmadi', value: absent, color: 'var(--status-absent)' },
					{ label: 'Kech', value: late, color: 'var(--status-late)' },
				].map(({ label, value, color }) => (
					<div
						key={label}
						style={{
							textAlign: 'center',
							background: 'var(--tg-secondary-bg)',
							borderRadius: '10px',
							padding: '8px 4px',
						}}
					>
						<p
							style={{
								fontSize: '18px',
								fontWeight: 700,
								color,
								margin: 0,
								lineHeight: 1,
							}}
						>
							{value}
						</p>
						<p
							style={{
								fontSize: '11px',
								color: 'var(--tg-subtitle)',
								margin: '2px 0 0',
							}}
						>
							{label}
						</p>
					</div>
				))}
			</div>

			{/* Progress bar */}
			<div
				style={{
					height: '4px',
					backgroundColor: 'var(--tg-secondary-bg)',
					borderRadius: '2px',
					overflow: 'hidden',
					display: 'flex',
					gap: '2px',
				}}
			>
				<div
					style={{
						width: `${total > 0 ? (present / total) * 100 : 0}%`,
						backgroundColor: 'var(--status-present)',
						transition: 'width 0.4s ease',
					}}
				/>
				<div
					style={{
						width: `${total > 0 ? (late / total) * 100 : 0}%`,
						backgroundColor: 'var(--status-late)',
						transition: 'width 0.4s ease',
					}}
				/>
			</div>
		</div>
	)
}

// ============================================
// Stats Card
// ============================================
export function StatsCard({
	value,
	label,
	color,
	icon,
}: {
	value: string | number
	label: string
	color?: string
	icon?: string
}) {
	return (
		<div className='stat-card'>
			{icon && <span style={{ fontSize: '20px' }}>{icon}</span>}
			<p className='stat-value' style={{ color: color || 'var(--tg-text)' }}>
				{value}
			</p>
			<p className='stat-label'>{label}</p>
		</div>
	)
}

'use client'

import { StatusBadge } from '@/components/attendance'
import { EmptyState, LoadingScreen, PageHeader } from '@/components/shared'
import { api } from '@/lib/api'
import { formatDate, getFullName, haptic, tgConfirm } from '@/lib/telegram'
import { AttendanceRecord, Student } from '@/lib/types'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function StudentDetailPage() {
	const router = useRouter()
	const params = useParams()
	const studentId = parseInt(params.id as string)

	const [student, setStudent] = useState<Student | null>(null)
	const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
	const [stats, setStats] = useState({
		total: 0,
		present: 0,
		absent: 0,
		late: 0,
	})
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		loadStudentDetails()
	}, [studentId])

	const loadStudentDetails = async () => {
		setIsLoading(true)
		try {
			// Student ma'lumotlari
			const studentRes = await api.get<Student>(`/admin/students/${studentId}`)
			setStudent(studentRes)

			// Davomat tarixi (GET /admin/students/:id/attendance)
			// Hozircha mock data
			const attRes = await api.get<{ items: AttendanceRecord[] }>(
				`/admin/students/${studentId}/attendance`,
			)
			const records = attRes.items || []
			setAttendance(records)

			// Stats hisoblash
			const total = records.length
			const present = records.filter(r => r.status === 'present').length
			const absent = records.filter(r => r.status === 'absent').length
			const late = records.filter(r => r.status === 'late').length
			setStats({ total, present, absent, late })
		} catch (e) {
			console.error(e)
		} finally {
			setIsLoading(false)
		}
	}

	const handleDelete = async () => {
		if (!student) return
		const name = getFullName(student.user)
		const confirmed = await tgConfirm(
			`${name} ni o'quvchilardan o'chirasizmi? Uning barcha davomat tarixi ham o'chiriladi.`,
		)
		if (!confirmed) return

		haptic.medium()
		try {
			await api.delete(`/admin/students/${studentId}`)
			haptic.success()
			router.back()
		} catch {
			haptic.error()
			alert("O'chirib bo'lmadi")
		}
	}

	if (isLoading) return <LoadingScreen />
	if (!student) return <EmptyState icon='❌' title="O'quvchi topilmadi" />

	const name = getFullName(student.user)
	const initials = name
		.split(' ')
		.map(n => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)
	const percentage =
		stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0
	const percentageColor =
		percentage >= 80 ? '#34c759' : percentage >= 60 ? '#ff9500' : '#ff3b30'

	return (
		<div
			className='page-enter'
			style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
		>
			<PageHeader
				title="O'quvchi profili"
				rightAction={
					<button
						onClick={() => {
							haptic.light()
							router.back()
						}}
						style={{
							background: 'var(--tg-secondary-bg)',
							border: 'none',
							borderRadius: '50%',
							width: 32,
							height: 32,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							cursor: 'pointer',
							fontSize: '16px',
							color: 'var(--tg-link)',
						}}
					>
						‹
					</button>
				}
			/>

			<div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
				{/* Profile Card */}
				<div
					style={{
						background: 'linear-gradient(135deg, #34c759 0%, #30d158 100%)',
						borderRadius: '20px',
						padding: '24px',
						marginBottom: '16px',
						color: 'white',
						position: 'relative',
						overflow: 'hidden',
					}}
				>
					<div style={{ position: 'relative', zIndex: 1 }}>
						<div
							style={{
								width: 80,
								height: 80,
								borderRadius: '50%',
								background: 'rgba(255, 255, 255, 0.25)',
								backdropFilter: 'blur(10px)',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								fontSize: '32px',
								fontWeight: 700,
								marginBottom: '16px',
								border: '3px solid rgba(255, 255, 255, 0.3)',
							}}
						>
							{student.user?.photo_url ? (
								<img
									src={student.user.photo_url}
									alt={name}
									style={{
										width: '100%',
										height: '100%',
										borderRadius: '50%',
										objectFit: 'cover',
									}}
								/>
							) : (
								initials
							)}
						</div>
						<h2
							style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 4px' }}
						>
							{name}
						</h2>
						<p style={{ fontSize: '14px', opacity: 0.85, margin: 0 }}>
							{student.group?.name || 'Guruhsiz'} •{' '}
							{student.user?.username
								? `@${student.user.username}`
								: `ID: ${student.user?.telegram_id}`}
						</p>
						{student.user?.phone && (
							<p style={{ fontSize: '14px', opacity: 0.85, margin: '4px 0 0' }}>
								📱 {student.user.phone}
							</p>
						)}
					</div>
					<div
						style={{
							position: 'absolute',
							top: -50,
							right: -50,
							width: 150,
							height: 150,
							borderRadius: '50%',
							background: 'rgba(255, 255, 255, 0.1)',
						}}
					/>
				</div>

				{/* Attendance Percentage */}
				<div
					style={{
						background: 'var(--tg-section-bg)',
						borderRadius: '20px',
						padding: '20px',
						marginBottom: '16px',
						textAlign: 'center',
					}}
				>
					<div
						style={{
							fontSize: '48px',
							fontWeight: 800,
							color: percentageColor,
							lineHeight: 1,
						}}
					>
						{percentage}%
					</div>
					<div
						style={{
							fontSize: '14px',
							color: 'var(--tg-subtitle)',
							marginTop: '6px',
						}}
					>
						Davomat foizi
					</div>
					<div
						style={{
							height: '6px',
							background: 'var(--tg-secondary-bg)',
							borderRadius: '3px',
							marginTop: '12px',
							overflow: 'hidden',
						}}
					>
						<div
							style={{
								height: '100%',
								width: `${percentage}%`,
								background: percentageColor,
								borderRadius: '3px',
								transition: 'width 0.5s ease',
							}}
						/>
					</div>
				</div>

				{/* Stats Grid */}
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(3, 1fr)',
						gap: '10px',
						marginBottom: '16px',
					}}
				>
					<div
						style={{
							background: 'var(--tg-section-bg)',
							borderRadius: '16px',
							padding: '16px',
							textAlign: 'center',
						}}
					>
						<div
							style={{
								fontSize: '24px',
								fontWeight: 800,
								color: '#34c759',
								lineHeight: 1,
							}}
						>
							{stats.present}
						</div>
						<div
							style={{
								fontSize: '11px',
								color: 'var(--tg-subtitle)',
								marginTop: '4px',
							}}
						>
							Keldi
						</div>
					</div>
					<div
						style={{
							background: 'var(--tg-section-bg)',
							borderRadius: '16px',
							padding: '16px',
							textAlign: 'center',
						}}
					>
						<div
							style={{
								fontSize: '24px',
								fontWeight: 800,
								color: '#ff3b30',
								lineHeight: 1,
							}}
						>
							{stats.absent}
						</div>
						<div
							style={{
								fontSize: '11px',
								color: 'var(--tg-subtitle)',
								marginTop: '4px',
							}}
						>
							Kelmadi
						</div>
					</div>
					<div
						style={{
							background: 'var(--tg-section-bg)',
							borderRadius: '16px',
							padding: '16px',
							textAlign: 'center',
						}}
					>
						<div
							style={{
								fontSize: '24px',
								fontWeight: 800,
								color: '#ff9500',
								lineHeight: 1,
							}}
						>
							{stats.late}
						</div>
						<div
							style={{
								fontSize: '11px',
								color: 'var(--tg-subtitle)',
								marginTop: '4px',
							}}
						>
							Kech
						</div>
					</div>
				</div>

				{/* Attendance History */}
				<div style={{ marginBottom: '16px' }}>
					<h3
						style={{
							fontSize: '11px',
							fontWeight: 600,
							textTransform: 'uppercase',
							letterSpacing: '0.5px',
							color: 'var(--tg-section-header)',
							margin: '0 0 8px',
						}}
					>
						Davomat tarixi ({stats.total})
					</h3>
					{attendance.length === 0 ? (
						<EmptyState
							icon='📅'
							title="Davomat yo'q"
							description='Hali davomat belgilanmagan'
						/>
					) : (
						<div className='tg-section'>
							{attendance.slice(0, 10).map((record, index) => (
								<div
									key={record.id}
									className='tg-item'
									style={{
										borderBottom:
											index === attendance.length - 1
												? 'none'
												: '0.5px solid var(--tg-secondary-bg)',
									}}
								>
									<div style={{ flex: 1 }}>
										<div className='tg-item-name'>
											{formatDate(new Date(record.date))}
										</div>
										{record.note && (
											<div className='tg-item-sub'>{record.note}</div>
										)}
									</div>
									<StatusBadge status={record.status} />
								</div>
							))}
						</div>
					)}
				</div>

				{/* Danger Zone */}
				<div
					style={{
						background:
							'color-mix(in srgb, var(--status-absent) 8%, transparent)',
						borderRadius: '16px',
						padding: '16px',
						border:
							'1px solid color-mix(in srgb, var(--status-absent) 20%, transparent)',
					}}
				>
					<h4
						style={{
							fontSize: '14px',
							fontWeight: 600,
							color: 'var(--status-absent)',
							margin: '0 0 8px',
						}}
					>
						⚠️ Xavfli zona
					</h4>
					<p
						style={{
							fontSize: '13px',
							color: 'var(--tg-subtitle)',
							margin: '0 0 12px',
						}}
					>
						O'quvchini o'chirish uning barcha davomat tarixini ham o'chiradi.
					</p>
					<button
						onClick={handleDelete}
						style={{
							width: '100%',
							padding: '12px',
							background: 'var(--status-absent)',
							color: 'white',
							border: 'none',
							borderRadius: '12px',
							fontSize: '14px',
							fontWeight: 600,
							cursor: 'pointer',
						}}
					>
						O'quvchini o'chirish
					</button>
				</div>
			</div>
		</div>
	)
}

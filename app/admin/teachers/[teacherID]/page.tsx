'use client'

import { EmptyState, LoadingScreen, PageHeader } from '@/components/shared'
import { api } from '@/lib/api'
import { getFullName, haptic, tgConfirm } from '@/lib/telegram'
import { AttendanceRecord, Group, User } from '@/lib/types'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function TeacherDetailPage() {
	const router = useRouter()
	const params = useParams()
	const teacherId = parseInt(params.id as string)

	const [teacher, setTeacher] = useState<User | null>(null)
	const [groups, setGroups] = useState<Group[]>([])
	const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>(
		[],
	)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		loadTeacherDetails()
	}, [teacherId])

	const loadTeacherDetails = async () => {
		setIsLoading(true)
		try {
			// Teacher ma'lumotlari (admin endpoint qo'shish kerak: GET /admin/teachers/:id)
			const teacherRes = await api.get<User>(`/admin/teachers/${teacherId}`)
			setTeacher(teacherRes)

			// O'qituvchi guruhlari
			const groupsRes = await api.get<{ items: Group[] }>('/admin/groups')
			const teacherGroups = groupsRes.items.filter(
				g => g.teacher_id === teacherId,
			)
			setGroups(teacherGroups)

			// Oxirgi davomat (ixtiyoriy)
			// const attRes = await api.get<any>(`/admin/teachers/${teacherId}/recent-attendance`);
			// setRecentAttendance(attRes.items || []);
		} catch (e) {
			console.error(e)
		} finally {
			setIsLoading(false)
		}
	}

	const handleDelete = async () => {
		if (!teacher) return
		const confirmed = await tgConfirm(
			`${getFullName(teacher)} ni o'qituvchilardan o'chirasizmi? Uning barcha guruhlari ham o'chiriladi.`,
		)
		if (!confirmed) return

		haptic.medium()
		try {
			await api.delete(`/admin/teachers/${teacherId}`)
			haptic.success()
			router.back()
		} catch {
			haptic.error()
			alert("O'chirib bo'lmadi")
		}
	}

	if (isLoading) return <LoadingScreen />
	if (!teacher) return <EmptyState icon='❌' title="O'qituvchi topilmadi" />

	const name = getFullName(teacher)
	const initials = name
		.split(' ')
		.map(n => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)

	return (
		<div
			className='page-enter'
			style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
		>
			{/* Header with back button */}
			<PageHeader
				title="O'qituvchi profili"
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
						background:
							'linear-gradient(135deg, var(--tg-button) 0%, var(--tg-link) 100%)',
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
							{teacher.photo_url ? (
								<img
									src={teacher.photo_url}
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
							{teacher.username
								? `@${teacher.username}`
								: `ID: ${teacher.telegram_id}`}
						</p>
						{teacher.phone && (
							<p style={{ fontSize: '14px', opacity: 0.85, margin: '4px 0 0' }}>
								📱 {teacher.phone}
							</p>
						)}
					</div>
					{/* Decorative circle */}
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

				{/* Stats */}
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(2, 1fr)',
						gap: '12px',
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
								fontSize: '28px',
								fontWeight: 800,
								color: 'var(--tg-link)',
								lineHeight: 1,
							}}
						>
							{groups.length}
						</div>
						<div
							style={{
								fontSize: '12px',
								color: 'var(--tg-subtitle)',
								marginTop: '4px',
							}}
						>
							Guruhlar
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
								fontSize: '28px',
								fontWeight: 800,
								color: '#34c759',
								lineHeight: 1,
							}}
						>
							{groups.reduce((sum, g) => sum + (g.student_count || 0), 0)}
						</div>
						<div
							style={{
								fontSize: '12px',
								color: 'var(--tg-subtitle)',
								marginTop: '4px',
							}}
						>
							O'quvchilar
						</div>
					</div>
				</div>

				{/* Groups */}
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
						Guruhlar ({groups.length})
					</h3>
					{groups.length === 0 ? (
						<EmptyState
							icon='📚'
							title="Guruhlar yo'q"
							description="Bu o'qituvchiga hali guruh biriktirilmagan"
						/>
					) : (
						<div className='tg-section'>
							{groups.map((group, index) => (
								<div
									key={group.id}
									onClick={() => {
										haptic.light()
										router.push(`/admin/groups/${group.id}`)
									}}
									className='tg-item'
									style={{
										borderBottom:
											index === groups.length - 1
												? 'none'
												: '0.5px solid var(--tg-secondary-bg)',
										cursor: 'pointer',
									}}
								>
									<div
										className='icon-box'
										style={{
											background: `hsl(${(group.id * 47) % 360}, 60%, 95%)`,
										}}
									>
										<span style={{ fontSize: '20px' }}>📚</span>
									</div>
									<div style={{ flex: 1, minWidth: 0 }}>
										<div className='tg-item-name'>{group.name}</div>
										<div className='tg-item-sub'>
											{group.course_name || "Fan ko'rsatilmagan"} •{' '}
											{group.student_count || 0} o'quvchi
										</div>
									</div>
									<span className='arrow'>›</span>
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
						O'qituvchini o'chirish uning barcha guruhlarini ham o'chiradi.
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
						O'qituvchini o'chirish
					</button>
				</div>
			</div>
		</div>
	)
}

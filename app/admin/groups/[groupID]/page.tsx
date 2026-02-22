'use client'

import { EmptyState, LoadingScreen, PageHeader } from '@/components/shared'
import { api } from '@/lib/api'
import { getFullName, haptic, tgConfirm } from '@/lib/telegram'
import { Group, Student } from '@/lib/types'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function GroupDetailPage() {
	const router = useRouter()
	const params = useParams()
	const groupId = parseInt(params.id as string)

	const [group, setGroup] = useState<Group | null>(null)
	const [students, setStudents] = useState<Student[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [showEditForm, setShowEditForm] = useState(false)
	const [editForm, setEditForm] = useState({
		name: '',
		subject: '',
		schedule: '',
	})

	useEffect(() => {
		loadGroupDetails()
	}, [groupId])

	const loadGroupDetails = async () => {
		setIsLoading(true)
		try {
			const groupRes = await api.get<Group>(`/admin/groups/${groupId}`)
			setGroup(groupRes)
			setEditForm({
				name: groupRes.name,
				subject: groupRes.course_name || '',
				schedule: groupRes.schedule_days || '',
			})

			// Guruh o'quvchilari
			const studentsRes = await api.get<{ items: Student[] }>(
				`/admin/students?group_id=${groupId}`,
			)
			setStudents(studentsRes.items)
		} catch (e) {
			console.error(e)
		} finally {
			setIsLoading(false)
		}
	}

	const handleUpdate = async () => {
		if (!editForm.name.trim()) {
			haptic.error()
			alert('Guruh nomi kiritilishi shart!')
			return
		}
		haptic.medium()
		try {
			await api.put(`/admin/groups/${groupId}`, {
				name: editForm.name,
				subject: editForm.subject || undefined,
				schedule: editForm.schedule || undefined,
			})
			haptic.success()
			setShowEditForm(false)
			loadGroupDetails()
		} catch {
			haptic.error()
			alert('Xatolik yuz berdi')
		}
	}

	const handleDelete = async () => {
		if (!group) return
		const confirmed = await tgConfirm(
			`${group.name} guruhini o'chirasizmi? Uning barcha o'quvchilari guruhsiz qoladi.`,
		)
		if (!confirmed) return

		haptic.medium()
		try {
			await api.delete(`/admin/groups/${groupId}`)
			haptic.success()
			router.back()
		} catch {
			haptic.error()
			alert("O'chirib bo'lmadi")
		}
	}

	if (isLoading) return <LoadingScreen />
	if (!group) return <EmptyState icon='❌' title='Guruh topilmadi' />

	return (
		<div
			className='page-enter'
			style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
		>
			<PageHeader
				title='Guruh profili'
				leftAction={
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
				rightAction={
					<button
						onClick={() => {
							haptic.light()
							setShowEditForm(!showEditForm)
						}}
						style={{
							background: showEditForm
								? 'var(--tg-secondary-bg)'
								: 'var(--tg-button)',
							color: showEditForm ? 'var(--tg-text)' : 'var(--tg-button-text)',
							border: 'none',
							borderRadius: '20px',
							padding: '6px 16px',
							fontSize: '14px',
							fontWeight: 600,
							cursor: 'pointer',
						}}
					>
						{showEditForm ? 'Bekor' : 'Tahrirlash'}
					</button>
				}
			/>

			<div style={{ flex: 1, overflowY: 'auto' }}>
				{/* Edit Form */}
				{showEditForm && (
					<div
						className='page-enter'
						style={{
							padding: '16px',
							backgroundColor: 'var(--tg-bg)',
							borderBottom:
								'0.5px solid color-mix(in srgb, var(--tg-hint) 20%, transparent)',
						}}
					>
						<div
							style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
						>
							<input
								placeholder='Guruh nomi *'
								value={editForm.name}
								onChange={e =>
									setEditForm({ ...editForm, name: e.target.value })
								}
								style={inputStyle}
							/>
							<input
								placeholder='Fan (ixtiyoriy)'
								value={editForm.subject}
								onChange={e =>
									setEditForm({ ...editForm, subject: e.target.value })
								}
								style={inputStyle}
							/>
							<input
								placeholder='Dars jadvali (ixtiyoriy)'
								value={editForm.schedule}
								onChange={e =>
									setEditForm({ ...editForm, schedule: e.target.value })
								}
								style={inputStyle}
							/>
							<button className='tg-btn' onClick={handleUpdate}>
								Saqlash
							</button>
						</div>
					</div>
				)}

				<div style={{ padding: '16px' }}>
					{/* Group Header Card */}
					<div
						style={{
							background: 'linear-gradient(135deg, #ff9500 0%, #ff6b00 100%)',
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
									width: 64,
									height: 64,
									borderRadius: '16px',
									background: 'rgba(255, 255, 255, 0.25)',
									backdropFilter: 'blur(10px)',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									fontSize: '32px',
									marginBottom: '16px',
									border: '2px solid rgba(255, 255, 255, 0.3)',
								}}
							>
								📚
							</div>
							<h2
								style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 4px' }}
							>
								{group.name}
							</h2>
							{group.course_name && (
								<p
									style={{ fontSize: '14px', opacity: 0.85, margin: '0 0 2px' }}
								>
									📖 {group.course_name}
								</p>
							)}
							{group.schedule_days && (
								<p style={{ fontSize: '14px', opacity: 0.85, margin: 0 }}>
									🕐 {group.schedule_days}
								</p>
							)}
							{group.teacher && (
								<p
									style={{ fontSize: '14px', opacity: 0.85, margin: '6px 0 0' }}
								>
									👨‍🏫 {getFullName(group.teacher)}
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

					{/* Stats */}
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '1fr',
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
									fontSize: '32px',
									fontWeight: 800,
									color: 'var(--tg-link)',
									lineHeight: 1,
								}}
							>
								{students.length}
							</div>
							<div
								style={{
									fontSize: '12px',
									color: 'var(--tg-subtitle)',
									marginTop: '4px',
								}}
							>
								Jami o'quvchilar
							</div>
						</div>
					</div>

					{/* Students List */}
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
							O'quvchilar ({students.length})
						</h3>
						{students.length === 0 ? (
							<EmptyState
								icon='👨‍🎓'
								title="O'quvchilar yo'q"
								description="Bu guruhga hali o'quvchi qo'shilmagan"
							/>
						) : (
							<div className='tg-section'>
								{students.map((student, index) => {
									const name = getFullName(student.user)
									const initials = name
										.split(' ')
										.map(n => n[0])
										.join('')
										.toUpperCase()
										.slice(0, 2)
									return (
										<div
											key={student.id}
											onClick={() => {
												haptic.light()
												router.push(`/admin/students/${student.id}`)
											}}
											className='tg-item'
											style={{
												borderBottom:
													index === students.length - 1
														? 'none'
														: '0.5px solid var(--tg-secondary-bg)',
												cursor: 'pointer',
											}}
										>
											<div
												className='avatar'
												style={{
													background: `hsl(${(student.id * 73) % 360}, 55%, 50%)`,
												}}
											>
												{student.user?.photo_url ? (
													<img src={student.user.photo_url} alt={name} />
												) : (
													initials
												)}
											</div>
											<div style={{ flex: 1, minWidth: 0 }}>
												<div className='tg-item-name'>{name}</div>
												<div className='tg-item-sub'>
													{student.user?.username
														? `@${student.user.username}`
														: `ID: ${student.user?.telegram_id}`}
												</div>
											</div>
											<span className='arrow'>›</span>
										</div>
									)
								})}
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
							Guruhni o'chirish barcha o'quvchilarni guruhsiz qoldiradi.
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
							Guruhni o'chirish
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}

const inputStyle: React.CSSProperties = {
	width: '100%',
	padding: '12px 14px',
	backgroundColor: 'var(--tg-secondary-bg)',
	border: 'none',
	borderRadius: '12px',
	fontSize: '15px',
	color: 'var(--tg-text)',
	outline: 'none',
}

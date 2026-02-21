'use client'

import { EmptyState, LoadingScreen, PageHeader } from '@/components/shared'
import { adminApi } from '@/lib/api'
import { haptic, tgAlert, tgConfirm } from '@/lib/telegram'
import { Group, User } from '@/lib/types'
import { useEffect, useState } from 'react'

interface GroupForm {
	name: string
	teacher_id: string
	description: string
	course_name: string
	level: string
	schedule_days: string
	class_time: string
	max_students: string
}

const EMPTY_FORM: GroupForm = {
	name: '',
	teacher_id: '',
	description: '',
	course_name: '',
	level: '',
	schedule_days: '',
	class_time: '',
	max_students: '20',
}

const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert']
const DAYS = [
	{ label: 'Dush', value: '1' },
	{ label: 'Sesh', value: '2' },
	{ label: 'Chor', value: '3' },
	{ label: 'Pay', value: '4' },
	{ label: 'Juma', value: '5' },
	{ label: 'Shan', value: '6' },
	{ label: 'Yak', value: '0' },
]

export default function AdminGroupsPage() {
	const [groups, setGroups] = useState<Group[]>([])
	const [teachers, setTeachers] = useState<User[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [showForm, setShowForm] = useState(false)
	const [editingGroup, setEditingGroup] = useState<Group | null>(null)
	const [form, setForm] = useState<GroupForm>(EMPTY_FORM)
	const [selectedDays, setSelectedDays] = useState<string[]>([])

	const loadData = async () => {
		setIsLoading(true)
		try {
			const [groupsRes, teachersRes] = await Promise.all([
				adminApi.getGroups(),
				adminApi.getTeachers(),
			])
			setGroups(groupsRes.items)
			setTeachers(teachersRes.items)
		} catch (e) {
			console.error(e)
			await tgAlert("Ma'lumotlarni yuklab bo'lmadi!")
		} finally {
			setIsLoading(false)
		}
	}

	useEffect(() => {
		loadData()
	}, []) // eslint-disable-line react-hooks/exhaustive-deps

	const resetForm = () => {
		setForm(EMPTY_FORM)
		setSelectedDays([])
		setEditingGroup(null)
		setShowForm(false)
	}

	const handleEdit = (group: Group) => {
		setEditingGroup(group)
		setForm({
			name: group.name,
			teacher_id: group.teacher_id.toString(),
			description: group.description || '',
			course_name: group.course_name || '',
			level: group.level || '',
			schedule_days: group.schedule_days || '',
			class_time: group.class_time || '',
			max_students: group.max_students?.toString() || '20',
		})

		// Parse selected days
		if (group.schedule_days) {
			setSelectedDays(group.schedule_days.split(','))
		}

		setShowForm(true)
		haptic.light()
	}

	const toggleDay = (day: string) => {
		setSelectedDays(prev =>
			prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day],
		)
		haptic.light()
	}

	const handleSubmit = async () => {
		if (!form.name.trim() || !form.teacher_id) {
			await tgAlert("Guruh nomi va o'qituvchini kiriting!")
			return
		}

		haptic.medium()

		const scheduleStr = selectedDays.sort().join(',')

		const data = {
			name: form.name.trim(),
			teacher_id: parseInt(form.teacher_id),
			description: form.description.trim() || undefined,
			course_name: form.course_name.trim() || undefined,
			level: form.level || undefined,
			schedule_days: scheduleStr || undefined,
			class_time: form.class_time || undefined,
			max_students: form.max_students ? parseInt(form.max_students) : 20,
		}

		try {
			if (editingGroup) {
				// Update
				await adminApi.updateGroup(editingGroup.id, data)
			} else {
				// Create
				await adminApi.createGroup(data)
			}

			haptic.success()
			resetForm()
			loadData()
		} catch (err) {
			haptic.error()
			await tgAlert('Xatolik yuz berdi!')
			console.error(err)
		}
	}

	const handleDelete = async (group: Group) => {
		const confirmed = await tgConfirm(`"${group.name}" guruhini o'chirish?`)
		if (!confirmed) return

		haptic.medium()
		try {
			await adminApi.deleteGroup(group.id)
			haptic.success()
			loadData()
		} catch {
			haptic.error()
			await tgAlert("O'chirib bo'lmadi!")
		}
	}

	if (isLoading) return <LoadingScreen />

	return (
		<div
			className='page-enter'
			style={{ display: 'flex', flexDirection: 'column' }}
		>
			<PageHeader
				title='Guruhlar'
				subtitle={`${groups.length} ta guruh`}
				rightAction={
					<button
						onClick={() => {
							haptic.light()
							if (showForm) {
								resetForm()
							} else {
								setShowForm(true)
							}
						}}
						style={{
							background: showForm
								? 'var(--tg-secondary-bg)'
								: 'var(--tg-button)',
							color: showForm ? 'var(--tg-text)' : 'var(--tg-button-text)',
							border: 'none',
							borderRadius: '20px',
							padding: '6px 16px',
							fontSize: '14px',
							fontWeight: 600,
							cursor: 'pointer',
						}}
					>
						{showForm ? 'Bekor' : "+ Qo'shish"}
					</button>
				}
			/>

			{/* Form */}
			{showForm && (
				<div
					className='page-enter'
					style={{
						padding: '16px',
						backgroundColor: 'var(--tg-bg)',
						borderBottom:
							'0.5px solid color-mix(in srgb, var(--tg-hint) 20%, transparent)',
					}}
				>
					<h3
						style={{
							fontSize: '17px',
							fontWeight: 600,
							color: 'var(--tg-text)',
							margin: '0 0 12px',
						}}
					>
						{editingGroup ? 'Guruhni tahrirlash' : 'Yangi guruh'}
					</h3>

					<div
						style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
					>
						{/* Group Name */}
						<div>
							<label style={labelStyle}>Guruh nomi *</label>
							<input
								placeholder='Frontend Bootcamp'
								value={form.name}
								onChange={e => setForm({ ...form, name: e.target.value })}
								style={inputStyle}
							/>
						</div>

						{/* Teacher */}
						<div>
							<label style={labelStyle}>O'qituvchi *</label>
							<select
								value={form.teacher_id}
								onChange={e => setForm({ ...form, teacher_id: e.target.value })}
								style={inputStyle}
							>
								<option value=''>Tanlang</option>
								{teachers.map(t => (
									<option key={t.id} value={t.id}>
										{t.first_name} {t.last_name}
									</option>
								))}
							</select>
						</div>

						{/* Course Name */}
						<div>
							<label style={labelStyle}>Kurs nomi</label>
							<input
								placeholder='React & Next.js Development'
								value={form.course_name}
								onChange={e =>
									setForm({ ...form, course_name: e.target.value })
								}
								style={inputStyle}
							/>
						</div>

						{/* Level */}
						<div>
							<label style={labelStyle}>Daraja</label>
							<select
								value={form.level}
								onChange={e => setForm({ ...form, level: e.target.value })}
								style={inputStyle}
							>
								<option value=''>Tanlang</option>
								{LEVELS.map(level => (
									<option key={level} value={level}>
										{level}
									</option>
								))}
							</select>
						</div>

						{/* Schedule Days */}
						<div>
							<label style={labelStyle}>Dars kunlari</label>
							<div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
								{DAYS.map(day => (
									<button
										key={day.value}
										type='button'
										onClick={() => toggleDay(day.value)}
										style={{
											padding: '8px 12px',
											fontSize: '13px',
											fontWeight: 600,
											border: 'none',
											borderRadius: '10px',
											cursor: 'pointer',
											background: selectedDays.includes(day.value)
												? 'var(--tg-button)'
												: 'var(--tg-secondary-bg)',
											color: selectedDays.includes(day.value)
												? 'var(--tg-button-text)'
												: 'var(--tg-text)',
										}}
									>
										{day.label}
									</button>
								))}
							</div>
						</div>

						{/* Class Time */}
						<div>
							<label style={labelStyle}>Dars vaqti</label>
							<input
								type='time'
								value={form.class_time}
								onChange={e => setForm({ ...form, class_time: e.target.value })}
								style={inputStyle}
							/>
						</div>

						{/* Max Students */}
						<div>
							<label style={labelStyle}>Maksimal o'quvchilar soni</label>
							<input
								type='number'
								min='1'
								max='100'
								value={form.max_students}
								onChange={e =>
									setForm({ ...form, max_students: e.target.value })
								}
								style={inputStyle}
							/>
						</div>

						{/* Description */}
						<div>
							<label style={labelStyle}>Tavsif</label>
							<textarea
								placeholder="Guruh haqida qo'shimcha ma'lumot..."
								value={form.description}
								onChange={e =>
									setForm({ ...form, description: e.target.value })
								}
								rows={3}
								style={{ ...inputStyle, resize: 'vertical' }}
							/>
						</div>

						{/* Actions */}
						<button className='tg-btn' onClick={handleSubmit}>
							{editingGroup ? 'Saqlash' : "Guruh qo'shish"}
						</button>
					</div>
				</div>
			)}

			{/* Groups List */}
			<div style={{ padding: '16px' }}>
				{groups.length === 0 ? (
					<EmptyState
						icon='📚'
						title="Guruhlar yo'q"
						description="Yangi guruh qo'shing"
					/>
				) : (
					<div className='tg-section'>
						{groups.map((group, index) => {
							const teacher = teachers.find(t => t.id === group.teacher_id)
							const daysStr = group.schedule_days
								? group.schedule_days
										.split(',')
										.map(d => DAYS.find(day => day.value === d)?.label)
										.filter(Boolean)
										.join(', ')
								: null

							return (
								<div
									key={group.id}
									className='tg-list-item'
									style={{
										borderBottom:
											index === groups.length - 1
												? 'none'
												: '0.5px solid var(--tg-secondary-bg)',
										cursor: 'default',
										flexDirection: 'column',
										alignItems: 'stretch',
										gap: '12px',
									}}
								>
									<div
										style={{
											display: 'flex',
											alignItems: 'flex-start',
											gap: '12px',
										}}
									>
										<div
											style={{
												width: 48,
												height: 48,
												borderRadius: '14px',
												backgroundColor:
													'color-mix(in srgb, var(--tg-button) 15%, transparent)',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												fontSize: '24px',
												flexShrink: 0,
											}}
										>
											📚
										</div>

										<div style={{ flex: 1, minWidth: 0 }}>
											<p
												style={{
													fontSize: '16px',
													fontWeight: 600,
													color: 'var(--tg-text)',
													margin: 0,
												}}
											>
												{group.name}
											</p>

											{group.course_name && (
												<p
													style={{
														fontSize: '14px',
														color: 'var(--tg-subtitle)',
														margin: '2px 0 0',
													}}
												>
													{group.course_name}
													{group.level && ` • ${group.level}`}
												</p>
											)}

											<p
												style={{
													fontSize: '13px',
													color: 'var(--tg-subtitle)',
													margin: '4px 0 0',
												}}
											>
												👨‍🏫{' '}
												{teacher
													? `${teacher.first_name} ${teacher.last_name || ''}`
													: 'Belgilanmagan'}
											</p>

											{(daysStr || group.class_time) && (
												<p
													style={{
														fontSize: '12px',
														color: 'var(--tg-hint)',
														margin: '2px 0 0',
													}}
												>
													{daysStr && `📅 ${daysStr}`}
													{daysStr && group.class_time && ' • '}
													{group.class_time && `🕐 ${group.class_time}`}
												</p>
											)}

											<p
												style={{
													fontSize: '12px',
													color: 'var(--tg-hint)',
													margin: '2px 0 0',
												}}
											>
												👥 {group.student_count || 0} /{' '}
												{group.max_students || 20} o'quvchi
											</p>
										</div>
									</div>

									{/* Actions */}
									<div style={{ display: 'flex', gap: '8px' }}>
										<button
											onClick={() => handleEdit(group)}
											style={{
												flex: 1,
												background: 'var(--tg-button)',
												color: 'var(--tg-button-text)',
												border: 'none',
												borderRadius: '10px',
												padding: '10px',
												fontSize: '14px',
												fontWeight: 600,
												cursor: 'pointer',
											}}
										>
											Tahrirlash
										</button>
										<button
											onClick={() => handleDelete(group)}
											style={{
												background:
													'color-mix(in srgb, var(--status-absent) 12%, transparent)',
												color: 'var(--status-absent)',
												border: 'none',
												borderRadius: '10px',
												padding: '10px 16px',
												fontSize: '14px',
												fontWeight: 600,
												cursor: 'pointer',
											}}
										>
											O'chirish
										</button>
									</div>
								</div>
							)
						})}
					</div>
				)}
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

const labelStyle: React.CSSProperties = {
	display: 'block',
	fontSize: '13px',
	fontWeight: 600,
	color: 'var(--tg-subtitle)',
	marginBottom: '6px',
}

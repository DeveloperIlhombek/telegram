'use client'

import { EmptyState, LoadingScreen, PageHeader } from '@/components/shared'
import { adminApi } from '@/lib/api'
import { haptic, tgAlert, tgConfirm } from '@/lib/telegram'
import { Group, Student } from '@/lib/types'
import { useEffect, useState } from 'react'

interface StudentForm {
	telegram_id: string
	first_name: string
	last_name: string
	username: string
	phone: string
	group_id: string
	parent_name: string
	parent_phone: string
}

const EMPTY_FORM: StudentForm = {
	telegram_id: '',
	first_name: '',
	last_name: '',
	username: '',
	phone: '',
	group_id: '',
	parent_name: '',
	parent_phone: '',
}

export default function AdminStudentsPage() {
	const [students, setStudents] = useState<Student[]>([])
	const [groups, setGroups] = useState<Group[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [showForm, setShowForm] = useState(false)
	const [form, setForm] = useState<StudentForm>(EMPTY_FORM)
	const [filterGroup, setFilterGroup] = useState<string>('')
	const [searchQuery, setSearchQuery] = useState('')

	const loadData = async () => {
		setIsLoading(true)
		try {
			const [studentsRes, groupsRes] = await Promise.all([
				adminApi.getStudents(),
				adminApi.getGroups(),
			])
			setStudents(studentsRes.items)
			setGroups(groupsRes.items)
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
		setShowForm(false)
	}

	const handleSubmit = async () => {
		if (!form.telegram_id || !form.first_name || !form.last_name) {
			await tgAlert('Telegram ID, ism va familiya kiriting!')
			return
		}

		haptic.medium()

		try {
			await adminApi.createStudent({
				telegram_id: parseInt(form.telegram_id),
				first_name: form.first_name.trim(),
				last_name: form.last_name.trim(),
				username: form.username.trim() || undefined,
				phone: form.phone.trim() || undefined,
				group_id: form.group_id ? parseInt(form.group_id) : undefined,
				parent_name: form.parent_name.trim() || undefined,
				parent_phone: form.parent_phone.trim() || undefined,
			})

			haptic.success()
			resetForm()
			loadData()
		} catch (err) {
			haptic.error()
			const msg = err instanceof Error ? err.message : 'Xatolik yuz berdi!'
			await tgAlert(msg)
			console.error(err)
		}
	}

	const handleDelete = async (student: Student) => {
		const confirmed = await tgConfirm(
			`${student.first_name} ${student.last_name}ni o'chirish?`,
		)
		if (!confirmed) return

		haptic.medium()
		try {
			await adminApi.deleteStudent(student.id)
			haptic.success()
			loadData()
		} catch {
			haptic.error()
			await tgAlert("O'chirib bo'lmadi!")
		}
	}

	// Filter students
	const filteredStudents = students.filter(s => {
		const matchesGroup = filterGroup
			? s.group_id === parseInt(filterGroup)
			: true
		const matchesSearch = searchQuery
			? `${s.first_name} ${s.last_name} ${s.username || ''}`
					.toLowerCase()
					.includes(searchQuery.toLowerCase())
			: true
		return matchesGroup && matchesSearch
	})

	if (isLoading) return <LoadingScreen />

	return (
		<div
			className='page-enter'
			style={{ display: 'flex', flexDirection: 'column' }}
		>
			<PageHeader
				title="O'quvchilar"
				subtitle={`${students.length} ta o'quvchi`}
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

			{/* Filters */}
			<div
				style={{
					padding: '12px 16px',
					display: 'flex',
					gap: '8px',
					borderBottom:
						'0.5px solid color-mix(in srgb, var(--tg-hint) 20%, transparent)',
				}}
			>
				<input
					type='search'
					placeholder='🔍 Qidirish...'
					value={searchQuery}
					onChange={e => setSearchQuery(e.target.value)}
					style={{
						flex: 1,
						padding: '8px 12px',
						fontSize: '14px',
						border: 'none',
						borderRadius: '10px',
						backgroundColor: 'var(--tg-secondary-bg)',
						color: 'var(--tg-text)',
						outline: 'none',
					}}
				/>
				<select
					value={filterGroup}
					onChange={e => setFilterGroup(e.target.value)}
					style={{
						padding: '8px 12px',
						fontSize: '14px',
						border: 'none',
						borderRadius: '10px',
						backgroundColor: 'var(--tg-secondary-bg)',
						color: 'var(--tg-text)',
						outline: 'none',
					}}
				>
					<option value=''>Barcha guruhlar</option>
					{groups.map(g => (
						<option key={g.id} value={g.id}>
							{g.name}
						</option>
					))}
				</select>
			</div>

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
						Yangi o'quvchi
					</h3>

					<div
						style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
					>
						{/* Telegram ID */}
						<div>
							<label style={labelStyle}>Telegram ID *</label>
							<input
								type='number'
								placeholder='123456789'
								value={form.telegram_id}
								onChange={e =>
									setForm({ ...form, telegram_id: e.target.value })
								}
								style={inputStyle}
							/>
							<p style={hintStyle}>@userinfobot orqali topish mumkin</p>
						</div>

						{/* Name */}
						<div
							style={{
								display: 'grid',
								gridTemplateColumns: '1fr 1fr',
								gap: '12px',
							}}
						>
							<div>
								<label style={labelStyle}>Ism *</label>
								<input
									type='text'
									placeholder='Alisher'
									value={form.first_name}
									onChange={e =>
										setForm({ ...form, first_name: e.target.value })
									}
									style={inputStyle}
								/>
							</div>
							<div>
								<label style={labelStyle}>Familiya *</label>
								<input
									type='text'
									placeholder='Navoiy'
									value={form.last_name}
									onChange={e =>
										setForm({ ...form, last_name: e.target.value })
									}
									style={inputStyle}
								/>
							</div>
						</div>

						{/* Username & Phone */}
						<div
							style={{
								display: 'grid',
								gridTemplateColumns: '1fr 1fr',
								gap: '12px',
							}}
						>
							<div>
								<label style={labelStyle}>Username</label>
								<input
									type='text'
									placeholder='@alisher_n'
									value={form.username}
									onChange={e => setForm({ ...form, username: e.target.value })}
									style={inputStyle}
								/>
							</div>
							<div>
								<label style={labelStyle}>Telefon</label>
								<input
									type='tel'
									placeholder='+998 90 123 45 67'
									value={form.phone}
									onChange={e => setForm({ ...form, phone: e.target.value })}
									style={inputStyle}
								/>
							</div>
						</div>

						{/* Group */}
						<div>
							<label style={labelStyle}>Guruh</label>
							<select
								value={form.group_id}
								onChange={e => setForm({ ...form, group_id: e.target.value })}
								style={inputStyle}
							>
								<option value=''>Guruh tanlanmagan</option>
								{groups.map(g => (
									<option key={g.id} value={g.id}>
										{g.name}
									</option>
								))}
							</select>
						</div>

						{/* Parent Info */}
						<div>
							<label style={labelStyle}>Ota-ona ismi</label>
							<input
								type='text'
								placeholder='Mirzo Navoiy'
								value={form.parent_name}
								onChange={e =>
									setForm({ ...form, parent_name: e.target.value })
								}
								style={inputStyle}
							/>
						</div>
						<div>
							<label style={labelStyle}>Ota-ona telefoni</label>
							<input
								type='tel'
								placeholder='+998 90 765 43 21'
								value={form.parent_phone}
								onChange={e =>
									setForm({ ...form, parent_phone: e.target.value })
								}
								style={inputStyle}
							/>
						</div>

						{/* Submit */}
						<button className='tg-btn' onClick={handleSubmit}>
							O'quvchi qo'shish
						</button>
					</div>
				</div>
			)}

			{/* Students List */}
			<div style={{ padding: '16px' }}>
				{filteredStudents.length === 0 ? (
					<EmptyState
						icon='👨‍🎓'
						title={
							searchQuery || filterGroup ? 'Topilmadi' : "O'quvchilar yo'q"
						}
						description={
							searchQuery || filterGroup
								? "Filter yoki qidiruvni o'zgartiring"
								: "Yangi o'quvchi qo'shing"
						}
					/>
				) : (
					<div className='tg-section'>
						{filteredStudents.map((student, index) => {
							const group = groups.find(g => g.id === student.group_id)
							const enrollDays = student.enrollment_date
								? Math.floor(
										(new Date().getTime() -
											new Date(student.enrollment_date).getTime()) /
											(1000 * 60 * 60 * 24),
									)
								: 0

							return (
								<div
									key={student.id}
									className='tg-list-item'
									style={{
										borderBottom:
											index === filteredStudents.length - 1
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
										{/* Avatar */}
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
											👨‍🎓
										</div>

										{/* Info */}
										<div style={{ flex: 1, minWidth: 0 }}>
											<p
												style={{
													fontSize: '16px',
													fontWeight: 600,
													color: 'var(--tg-text)',
													margin: 0,
												}}
											>
												{student.first_name} {student.last_name}
											</p>

											{student.student_id && (
												<p
													style={{
														fontSize: '12px',
														color: 'var(--tg-hint)',
														margin: '2px 0 0',
														fontFamily: 'monospace',
													}}
												>
													ID: {student.student_id}
												</p>
											)}

											{student.username && (
												<p
													style={{
														fontSize: '13px',
														color: 'var(--tg-subtitle)',
														margin: '4px 0 0',
													}}
												>
													@{student.username}
												</p>
											)}

											{student.phone && (
												<p
													style={{
														fontSize: '13px',
														color: 'var(--tg-subtitle)',
														margin: '2px 0 0',
													}}
												>
													📱 {student.phone}
												</p>
											)}

											{group && (
												<p
													style={{
														fontSize: '13px',
														color: 'var(--tg-button)',
														margin: '4px 0 0',
													}}
												>
													👥 {group.name}
												</p>
											)}

											{student.parent_name && (
												<p
													style={{
														fontSize: '12px',
														color: 'var(--tg-hint)',
														margin: '4px 0 0',
													}}
												>
													👨‍👩‍👦 {student.parent_name}
													{student.parent_phone && ` • ${student.parent_phone}`}
												</p>
											)}

											{enrollDays > 0 && (
												<p
													style={{
														fontSize: '11px',
														color: 'var(--tg-hint)',
														margin: '4px 0 0',
													}}
												>
													📅 {enrollDays} kun oldin qo'shilgan
												</p>
											)}
										</div>
									</div>

									{/* Actions */}
									<div style={{ display: 'flex', gap: '8px' }}>
										<button
											onClick={() => handleDelete(student)}
											style={{
												flex: 1,
												background:
													'color-mix(in srgb, var(--status-absent) 12%, transparent)',
												color: 'var(--status-absent)',
												border: 'none',
												borderRadius: '10px',
												padding: '10px',
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

const hintStyle: React.CSSProperties = {
	fontSize: '11px',
	color: 'var(--tg-hint)',
	marginTop: '4px',
	marginBottom: 0,
}

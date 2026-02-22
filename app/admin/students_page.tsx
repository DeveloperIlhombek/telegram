'use client'

import { EmptyState, LoadingScreen, PageHeader } from '@/components/shared'
import { adminApi } from '@/lib/api'
import { getFullName, haptic, tgAlert, tgConfirm } from '@/lib/telegram'
import { Group, Student } from '@/lib/types'
import { useEffect, useState } from 'react'

export default function AdminStudentsPage() {
	const [students, setStudents] = useState<Student[]>([])
	const [groups, setGroups] = useState<Group[]>([])
	const [selectedGroup, setSelectedGroup] = useState<number | undefined>()
	const [isLoading, setIsLoading] = useState(true)
	const [showForm, setShowForm] = useState(false)
	const [form, setForm] = useState({
		telegram_id: '',
		first_name: '',
		last_name: '',
		full_name: '',
		phone: '',
		username: '',
		parent_name: '',
		parent_phone: '',
		group_id: '',
	})

	const loadData = async () => {
		setIsLoading(true)
		try {
			const [studentsRes, groupsRes] = await Promise.all([
				adminApi.getStudents(selectedGroup),
				adminApi.getGroups(),
			])
			setStudents(studentsRes.items)
			setGroups(groupsRes.items)
		} catch (e) {
			console.error(e)
		} finally {
			setIsLoading(false)
		}
	}

	useEffect(() => {
		loadData()
	}, [selectedGroup])

	const handleCreate = async () => {
		if (!form.first_name.trim() || !form.telegram_id || !form.group_id) {
			await tgAlert('Ism, Telegram ID va guruh majburiy!')
			return
		}
		haptic.medium()
		try {
			await adminApi.createStudent({
				telegram_id: parseInt(form.telegram_id),
				first_name: form.first_name.trim(),
				last_name: form.last_name.trim(),
				full_name: `${form.first_name} ${form.last_name}`,
				username: form.username.trim() || undefined,
				phone: form.phone.trim() || undefined,
				group_id: form.group_id ? parseInt(form.group_id) : undefined,
				parent_name: form.parent_name.trim() || undefined,
				parent_phone: form.parent_phone.trim() || undefined,
			})
			haptic.success()
			setForm({
				telegram_id: '',
				first_name: '',
				last_name: '',
				full_name: '',
				username: '',
				parent_name: '',
				parent_phone: '',
				phone: '',
				group_id: '',
			})
			setShowForm(false)
			loadData()
		} catch {
			haptic.error()
			await tgAlert('Xatolik yuz berdi!')
		}
	}

	const handleDelete = async (student: Student) => {
		const name = getFullName(student.user)
		const confirmed = await tgConfirm(`${name} ni o'quvchilardan o'chirish?`)
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
							setShowForm(!showForm)
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

			{/* Add student form */}
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
					<div
						style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
					>
						<input
							placeholder='Telegram ID *'
							type='number'
							value={form.telegram_id}
							onChange={e => setForm({ ...form, telegram_id: e.target.value })}
							style={inputStyle}
						/>
						<input
							placeholder='Ism *'
							value={form.first_name}
							onChange={e => setForm({ ...form, first_name: e.target.value })}
							style={inputStyle}
						/>
						<input
							placeholder='Familiya'
							value={form.last_name}
							onChange={e => setForm({ ...form, last_name: e.target.value })}
							style={inputStyle}
						/>
						<input
							placeholder='Telefon'
							type='tel'
							value={form.phone}
							onChange={e => setForm({ ...form, phone: e.target.value })}
							style={inputStyle}
						/>
						<select
							value={form.group_id}
							onChange={e => setForm({ ...form, group_id: e.target.value })}
							style={inputStyle}
						>
							<option value=''>Guruhni tanlang *</option>
							{groups.map(g => (
								<option key={g.id} value={g.id}>
									{g.name}
								</option>
							))}
						</select>
						<button className='tg-btn' onClick={handleCreate}>
							O'quvchi qo'shish
						</button>
					</div>
				</div>
			)}

			{/* Group filter */}
			<div
				style={{
					padding: '10px 16px',
					backgroundColor: 'var(--tg-bg)',
					borderBottom:
						'0.5px solid color-mix(in srgb, var(--tg-hint) 15%, transparent)',
				}}
			>
				<div
					style={{
						display: 'flex',
						gap: '8px',
						overflowX: 'auto',
						paddingBottom: '2px',
					}}
				>
					<FilterChip
						label='Barchasi'
						active={!selectedGroup}
						onClick={() => setSelectedGroup(undefined)}
					/>
					{groups.map(g => (
						<FilterChip
							key={g.id}
							label={g.name}
							active={selectedGroup === g.id}
							onClick={() =>
								setSelectedGroup(selectedGroup === g.id ? undefined : g.id)
							}
						/>
					))}
				</div>
			</div>

			{/* Students list */}
			<div style={{ padding: '16px' }}>
				{students.length === 0 ? (
					<EmptyState
						icon='👨‍🎓'
						title="O'quvchilar yo'q"
						description="Yangi o'quvchi qo'shing"
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
									className='tg-list-item'
									style={{
										borderBottom:
											index === students.length - 1
												? 'none'
												: '0.5px solid var(--tg-secondary-bg)',
										cursor: 'default',
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
											{name}
										</p>
										<p
											style={{
												fontSize: '13px',
												color: 'var(--tg-subtitle)',
												margin: '2px 0 0',
											}}
										>
											{student.group?.name || 'Guruh belgilanmagan'}
											{student.user?.phone && ` • ${student.user.phone}`}
										</p>
									</div>
									<button
										onClick={() => handleDelete(student)}
										style={{
											background:
												'color-mix(in srgb, var(--status-absent) 12%, transparent)',
											color: 'var(--status-absent)',
											border: 'none',
											borderRadius: '8px',
											padding: '6px 12px',
											fontSize: '13px',
											fontWeight: 600,
											cursor: 'pointer',
										}}
									>
										O'chir
									</button>
								</div>
							)
						})}
					</div>
				)}
			</div>
		</div>
	)
}

function FilterChip({
	label,
	active,
	onClick,
}: {
	label: string
	active: boolean
	onClick: () => void
}) {
	return (
		<button
			onClick={onClick}
			style={{
				padding: '6px 14px',
				borderRadius: '20px',
				border: 'none',
				fontSize: '13px',
				fontWeight: 600,
				cursor: 'pointer',
				whiteSpace: 'nowrap',
				flexShrink: 0,
				backgroundColor: active ? 'var(--tg-button)' : 'var(--tg-secondary-bg)',
				color: active ? 'var(--tg-button-text)' : 'var(--tg-hint)',
				transition: 'all 0.2s ease',
			}}
		>
			{label}
		</button>
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

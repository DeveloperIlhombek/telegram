'use client'

import { EmptyState, LoadingScreen, PageHeader } from '@/components/shared'
import { adminApi } from '@/lib/api'
import { getFullName, haptic, tgAlert, tgConfirm } from '@/lib/telegram'
import { User } from '@/lib/types'
import { useEffect, useState } from 'react'

export default function AdminTeachersPage() {
	const [teachers, setTeachers] = useState<User[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [showForm, setShowForm] = useState(false)
	const [form, setForm] = useState({
		telegram_id: '',
		first_name: '',
		last_name: '',
		phone: '',
	})

	const loadTeachers = async () => {
		setIsLoading(true)
		try {
			const res = await adminApi.getTeachers()
			setTeachers(res.items)
		} catch (e) {
			console.error(e)
		} finally {
			setIsLoading(false)
		}
	}

	useEffect(() => {
		loadTeachers()
	}, [])

	const handleCreate = async () => {
		if (!form.first_name.trim() || !form.telegram_id) {
			await tgAlert('Ism va Telegram ID majburiy!')
			return
		}
		haptic.medium()
		try {
			await adminApi.createTeacher({
				telegram_id: parseInt(form.telegram_id),
				first_name: form.first_name.trim(),
				last_name: form.last_name.trim(),
				phone: form.phone.trim() || undefined,
			})
			haptic.success()
			setForm({ telegram_id: '', first_name: '', last_name: '', phone: '' })
			setShowForm(false)
			loadTeachers()
		} catch {
			haptic.error()
			await tgAlert('Xatolik yuz berdi!')
		}
	}

	const handleDelete = async (teacher: User) => {
		const confirmed = await tgConfirm(
			`${getFullName(teacher)} ni o'qituvchilardan o'chirish?`,
		)
		if (!confirmed) return
		haptic.medium()
		try {
			await adminApi.deleteTeacher(teacher.id)
			haptic.success()
			loadTeachers()
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
				title="O'qituvchilar"
				subtitle={`${teachers.length} ta o'qituvchi`}
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
							placeholder='Telefon raqami'
							type='tel'
							value={form.phone}
							onChange={e => setForm({ ...form, phone: e.target.value })}
							style={inputStyle}
						/>
						<button className='tg-btn' onClick={handleCreate}>
							O'qituvchi qo'shish
						</button>
					</div>
				</div>
			)}

			<div style={{ padding: '16px' }}>
				{teachers.length === 0 ? (
					<EmptyState
						icon='👨‍🏫'
						title="O'qituvchilar yo'q"
						description="Yangi o'qituvchi qo'shing"
					/>
				) : (
					<div className='tg-section'>
						{teachers.map((teacher, index) => {
							const name = getFullName(teacher)
							const initials = name
								.split(' ')
								.map(n => n[0])
								.join('')
								.toUpperCase()
								.slice(0, 2)
							return (
								<div
									key={teacher.id}
									className='tg-list-item'
									style={{
										borderBottom:
											index === teachers.length - 1
												? 'none'
												: '0.5px solid var(--tg-secondary-bg)',
										cursor: 'default',
									}}
								>
									<div
										className='avatar'
										style={{
											background: `hsl(${(teacher.id * 47) % 360}, 60%, 55%)`,
										}}
									>
										{teacher.photo_url ? (
											<img src={teacher.photo_url} alt={name} />
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
											{teacher.phone || `ID: ${teacher.telegram_id}`}
										</p>
									</div>
									<button
										onClick={() => handleDelete(teacher)}
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

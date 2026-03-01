'use client'

import { adminApi, StudentCreateData } from '@/lib/api'
import { haptic, tgAlert, tgConfirm } from '@/lib/telegram'
import { Group, PaymentStatus, Student, StudentStatus } from '@/lib/types'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

// ─── helpers ──────────────────────────────────────────────────────────────────

const statusLabel: Record<StudentStatus, string> = {
	active: 'Faol',
	inactive: 'Faol emas',
	graduated: 'Bitirgan',
	suspended: "To'xtatilgan",
	expelled: 'Chiqarilgan',
}
const statusColor: Record<StudentStatus, string> = {
	active: '#30d158',
	inactive: '#8e8e93',
	graduated: '#007aff',
	suspended: '#ff9500',
	expelled: '#ff3b30',
}
const paymentColor: Record<PaymentStatus, string> = {
	paid: '#30d158',
	unpaid: '#ff3b30',
	partial: '#ff9500',
	overdue: '#ff2d55',
}
const paymentLabel: Record<PaymentStatus, string> = {
	paid: "To'langan",
	unpaid: "To'lanmagan",
	partial: 'Qisman',
	overdue: 'Muddati otgan',
}

function getInitials(first: string, last: string) {
	return `${first[0] || ''}${last[0] || ''}`.toUpperCase()
}

const AVATAR_COLORS = [
	'linear-gradient(135deg,#667eea,#764ba2)',
	'linear-gradient(135deg,#f093fb,#f5576c)',
	'linear-gradient(135deg,#4facfe,#00f2fe)',
	'linear-gradient(135deg,#43e97b,#38f9d7)',
	'linear-gradient(135deg,#fa709a,#fee140)',
	'linear-gradient(135deg,#a18cd1,#fbc2eb)',
]
function avatarColor(id: number) {
	return AVATAR_COLORS[id % AVATAR_COLORS.length]
}

// ─── empty form ───────────────────────────────────────────────────────────────
const EMPTY: StudentCreateData & { telegram_id: number } = {
	telegram_id: '' as unknown as number,
	first_name: '',
	last_name: '',
	username: '',
	phone: '',
	group_id: undefined,
	parent_name: '',
	parent_phone: '',
	emergency_contact: '',
	address: '',
	notes: '',
	monthly_fee: undefined,
	discount_percent: 0,
}

// ─── component ────────────────────────────────────────────────────────────────
export default function AdminStudentsPage() {
	const [students, setStudents] = useState<Student[]>([])
	const [groups, setGroups] = useState<Group[]>([])
	const [loading, setLoading] = useState(true)
	const [showForm, setShowForm] = useState(false)
	const [submitting, setSubmitting] = useState(false)
	const [form, setForm] = useState(EMPTY)
	const [search, setSearch] = useState('')
	const [filterGroup, setFilterGroup] = useState('')
	const [filterStatus, setFilterStatus] = useState<StudentStatus | ''>('')
	const [filterPayment, setFilterPayment] = useState<PaymentStatus | ''>('')
	const [page, setPage] = useState(1)
	const [totalPages, setTotalPages] = useState(1)
	const [total, setTotal] = useState(0)
	const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set())
	const formRef = useRef<HTMLDivElement>(null)
	const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

	// ── load ──────────────────────────────────────────────────────────────────
	const load = async (p = page) => {
		setLoading(true)
		try {
			const [sRes, gRes] = await Promise.all([
				adminApi.getStudents({
					page: p,
					size: 15,
					group_id: filterGroup ? Number(filterGroup) : undefined,
					status: filterStatus || undefined,
					payment_status: filterPayment || undefined,
					search: search || undefined,
				}),
				adminApi.getGroups(1, 100),
			])
			setStudents(sRes.items)
			setTotal(sRes.total)
			setTotalPages(Math.ceil(sRes.total / 15))
			setGroups(gRes.items)
			// animate cards in
			setTimeout(() => {
				const ids = new Set(sRes.items.map(s => s.id))
				setVisibleCards(ids)
			}, 50)
		} catch (e) {
			console.error(e)
			await tgAlert("Ma'lumotlarni yuklab bo'lmadi!")
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		load(1)
		setPage(1)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [filterGroup, filterStatus, filterPayment])

	useEffect(() => {
		clearTimeout(searchTimeout.current!) /*Xato chiqishi mumkin */
		searchTimeout.current = setTimeout(() => {
			load(1)
			setPage(1)
		}, 400)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [search])

	const changePage = (p: number) => {
		setPage(p)
		setVisibleCards(new Set())
		load(p)
	}

	// ── submit ────────────────────────────────────────────────────────────────
	const handleSubmit = async () => {
		if (!form.telegram_id || !form.first_name || !form.last_name) {
			await tgAlert('Telegram ID, ism va familiya majburiy!')
			return
		}
		setSubmitting(true)
		haptic.medium()
		try {
			await adminApi.createStudent({
				...form,
				telegram_id: Number(form.telegram_id),
				group_id: form.group_id ? Number(form.group_id) : undefined,
				monthly_fee: form.monthly_fee ? Number(form.monthly_fee) : undefined,
				username: form.username || undefined,
				phone: form.phone || undefined,
				parent_name: form.parent_name || undefined,
				parent_phone: form.parent_phone || undefined,
				emergency_contact: form.emergency_contact || undefined,
				address: form.address || undefined,
				notes: form.notes || undefined,
			})
			haptic.success()
			setForm(EMPTY)
			setShowForm(false)
			load(1)
			setPage(1)
		} catch (err) {
			haptic.error()
			await tgAlert(err instanceof Error ? err.message : 'Xatolik!')
		} finally {
			setSubmitting(false)
		}
	}

	// ── delete ────────────────────────────────────────────────────────────────
	const handleDelete = async (s: Student) => {
		const ok = await tgConfirm(`${s.first_name} ${s.last_name} ni o'chirish?`)
		if (!ok) return
		haptic.medium()
		try {
			await adminApi.deleteStudent(s.id)
			haptic.success()
			load(page)
		} catch {
			haptic.error()
			await tgAlert("O'chirib bo'lmadi!")
		}
	}

	// ── render ────────────────────────────────────────────────────────────────
	return (
		<>
			<style>{`
				@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

				*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

				.sp { font-family: 'Outfit', sans-serif; }

				/* ── page ── */
				.sp-page {
					min-height: 100vh;
					background: #0a0a0f;
					color: #f0f0f5;
					position: relative;
					overflow-x: hidden;
				}
				.sp-page::before {
					content: '';
					position: fixed;
					inset: 0;
					background:
						radial-gradient(ellipse 80% 50% at 20% 10%, rgba(99,102,241,.18) 0%, transparent 60%),
						radial-gradient(ellipse 60% 40% at 80% 80%, rgba(168,85,247,.12) 0%, transparent 60%);
					pointer-events: none;
					z-index: 0;
				}

				/* ── header ── */
				.sp-header {
					position: sticky; top: 0; z-index: 50;
					display: flex; align-items: center; justify-content: space-between;
					padding: 16px 20px;
					background: rgba(10,10,15,.85);
					backdrop-filter: blur(20px);
					border-bottom: 1px solid rgba(255,255,255,.06);
				}
				.sp-header-title { font-size: 22px; font-weight: 800; letter-spacing: -.5px; }
				.sp-header-sub { font-size: 12px; color: rgba(255,255,255,.4); margin-top: 1px; }

				.sp-add-btn {
					display: flex; align-items: center; gap: 6px;
					padding: 9px 18px;
					background: linear-gradient(135deg, #6366f1, #8b5cf6);
					color: #fff; border: none; border-radius: 24px;
					font-family: 'Outfit', sans-serif;
					font-size: 14px; font-weight: 700;
					cursor: pointer;
					transition: all .2s;
					box-shadow: 0 4px 20px rgba(99,102,241,.4);
				}
				.sp-add-btn:active { transform: scale(.96); }
				.sp-add-btn.cancel {
					background: rgba(255,255,255,.08);
					box-shadow: none;
					color: rgba(255,255,255,.7);
				}

				/* ── filters ── */
				.sp-filters {
					padding: 12px 16px;
					display: flex; gap: 8px; flex-wrap: wrap;
					border-bottom: 1px solid rgba(255,255,255,.06);
					position: relative; z-index: 1;
				}
				.sp-search {
					flex: 1; min-width: 160px;
					padding: 10px 14px 10px 36px;
					background: rgba(255,255,255,.06);
					border: 1px solid rgba(255,255,255,.08);
					border-radius: 12px;
					font-family: 'Outfit', sans-serif;
					font-size: 14px; color: #f0f0f5;
					outline: none;
					transition: border-color .2s;
				}
				.sp-search:focus { border-color: rgba(99,102,241,.5); }
				.sp-search-wrap { position: relative; flex: 1; min-width: 160px; }
				.sp-search-icon {
					position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
					color: rgba(255,255,255,.35); font-size: 15px; pointer-events: none;
				}
				.sp-select {
					padding: 10px 14px;
					background: rgba(255,255,255,.06);
					border: 1px solid rgba(255,255,255,.08);
					border-radius: 12px;
					font-family: 'Outfit', sans-serif;
					font-size: 13px; color: #f0f0f5;
					outline: none; cursor: pointer;
					transition: border-color .2s;
				}
				.sp-select:focus { border-color: rgba(99,102,241,.5); }

				/* ── form ── */
				.sp-form-wrap {
					margin: 16px; border-radius: 20px;
					background: rgba(255,255,255,.04);
					border: 1px solid rgba(255,255,255,.08);
					overflow: hidden;
					animation: slideDown .3s cubic-bezier(.16,1,.3,1);
					position: relative; z-index: 1;
				}
				@keyframes slideDown {
					from { opacity: 0; transform: translateY(-16px); }
					to   { opacity: 1; transform: translateY(0); }
				}
				.sp-form-header {
					padding: 18px 20px 14px;
					border-bottom: 1px solid rgba(255,255,255,.06);
					display: flex; align-items: center; justify-content: space-between;
				}
				.sp-form-title { font-size: 17px; font-weight: 700; }
				.sp-form-body { padding: 16px 20px 20px; display: flex; flex-direction: column; gap: 14px; }
				.sp-form-section-label {
					font-size: 11px; font-weight: 700; letter-spacing: 1px;
					text-transform: uppercase; color: rgba(255,255,255,.35);
					margin-bottom: -6px;
				}
				.sp-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
				.sp-label {
					display: block; font-size: 12px; font-weight: 600;
					color: rgba(255,255,255,.45); margin-bottom: 5px;
				}
				.sp-input {
					width: 100%; padding: 11px 14px;
					background: rgba(255,255,255,.07);
					border: 1px solid rgba(255,255,255,.08);
					border-radius: 12px;
					font-family: 'Outfit', sans-serif;
					font-size: 14px; color: #f0f0f5;
					outline: none; transition: border-color .2s;
				}
				.sp-input:focus { border-color: rgba(99,102,241,.6); background: rgba(255,255,255,.09); }
				.sp-input::placeholder { color: rgba(255,255,255,.2); }
				.sp-hint { font-size: 11px; color: rgba(255,255,255,.25); margin-top: 4px; }

				.sp-submit-btn {
					width: 100%; padding: 14px;
					background: linear-gradient(135deg, #6366f1, #8b5cf6);
					color: #fff; border: none; border-radius: 14px;
					font-family: 'Outfit', sans-serif;
					font-size: 15px; font-weight: 700;
					cursor: pointer; margin-top: 4px;
					transition: all .2s;
					box-shadow: 0 6px 24px rgba(99,102,241,.4);
				}
				.sp-submit-btn:disabled { opacity: .6; cursor: not-allowed; }
				.sp-submit-btn:not(:disabled):active { transform: scale(.98); }

				/* ── list ── */
				.sp-list { padding: 12px 16px 32px; position: relative; z-index: 1; }

				/* ── card ── */
				.sp-card {
					background: rgba(255,255,255,.04);
					border: 1px solid rgba(255,255,255,.07);
					border-radius: 20px;
					margin-bottom: 12px;
					overflow: hidden;
					opacity: 0;
					transform: translateY(16px);
					transition: opacity .35s ease, transform .35s ease, border-color .2s;
				}
				.sp-card.visible { opacity: 1; transform: translateY(0); }
				.sp-card:hover { border-color: rgba(99,102,241,.25); }

				.sp-card-top {
					padding: 16px;
					display: flex; gap: 14px; align-items: flex-start;
					text-decoration: none; color: inherit;
				}
				.sp-avatar {
					width: 52px; height: 52px; border-radius: 16px;
					display: flex; align-items: center; justify-content: center;
					font-size: 18px; font-weight: 800; color: #fff;
					flex-shrink: 0;
					box-shadow: 0 4px 12px rgba(0,0,0,.3);
				}
				.sp-card-name { font-size: 17px; font-weight: 700; line-height: 1.2; }
				.sp-card-id {
					font-size: 11px; color: rgba(255,255,255,.35);
					font-family: 'SF Mono', monospace;
					margin-top: 3px;
				}
				.sp-card-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
				.sp-tag {
					padding: 3px 9px;
					border-radius: 20px;
					font-size: 11px; font-weight: 600;
					background: rgba(255,255,255,.08);
					color: rgba(255,255,255,.55);
				}
				.sp-tag.group-tag {
					background: rgba(99,102,241,.15);
					color: #818cf8;
				}

				/* badges */
				.sp-badge {
					display: inline-flex; align-items: center; gap: 4px;
					padding: 3px 9px;
					border-radius: 20px;
					font-size: 11px; font-weight: 700;
				}

				/* ── card footer ── */
				.sp-card-footer {
					padding: 10px 16px 14px;
					display: flex; gap: 8px;
					border-top: 1px solid rgba(255,255,255,.05);
				}
				.sp-action-btn {
					flex: 1; padding: 10px 8px;
					border: none; border-radius: 12px;
					font-family: 'Outfit', sans-serif;
					font-size: 13px; font-weight: 600;
					cursor: pointer; transition: all .15s;
					display: flex; align-items: center; justify-content: center; gap: 5px;
				}
				.sp-action-btn:active { transform: scale(.96); }
				.sp-action-btn.view-btn {
					background: rgba(99,102,241,.15); color: #818cf8;
					text-decoration: none;
				}
				.sp-action-btn.del-btn {
					background: rgba(255,59,48,.1); color: #ff453a;
				}

				/* ── extra info ── */
				.sp-card-extra {
					padding: 0 16px 12px;
					display: flex; flex-wrap: wrap; gap: 6px;
				}
				.sp-info-chip {
					display: flex; align-items: center; gap: 5px;
					font-size: 12px; color: rgba(255,255,255,.45);
				}

				/* ── pagination ── */
				.sp-pagination {
					display: flex; align-items: center; justify-content: center; gap: 8px;
					padding: 8px 16px 24px;
					position: relative; z-index: 1;
				}
				.sp-page-btn {
					min-width: 36px; height: 36px; padding: 0 10px;
					border: 1px solid rgba(255,255,255,.1);
					border-radius: 10px;
					background: rgba(255,255,255,.05);
					color: rgba(255,255,255,.6);
					font-family: 'Outfit', sans-serif;
					font-size: 13px; font-weight: 600;
					cursor: pointer; transition: all .15s;
					display: flex; align-items: center; justify-content: center;
				}
				.sp-page-btn:hover { background: rgba(99,102,241,.2); border-color: rgba(99,102,241,.4); color: #fff; }
				.sp-page-btn.active {
					background: linear-gradient(135deg,#6366f1,#8b5cf6);
					border-color: transparent; color: #fff;
					box-shadow: 0 4px 12px rgba(99,102,241,.4);
				}
				.sp-page-btn:disabled { opacity: .35; cursor: not-allowed; }

				/* ── empty ── */
				.sp-empty {
					text-align: center; padding: 60px 24px;
					color: rgba(255,255,255,.3);
				}
				.sp-empty-icon { font-size: 52px; margin-bottom: 12px; }
				.sp-empty-title { font-size: 18px; font-weight: 700; }
				.sp-empty-sub { font-size: 13px; margin-top: 6px; }

				/* ── skeleton ── */
				.sp-skeleton { border-radius: 20px; overflow: hidden; margin-bottom: 12px; }
				.sp-skel-inner {
					height: 140px;
					background: linear-gradient(90deg,
						rgba(255,255,255,.04) 0%,
						rgba(255,255,255,.09) 50%,
						rgba(255,255,255,.04) 100%);
					background-size: 200% 100%;
					animation: shimmer 1.4s infinite;
				}
				@keyframes shimmer { to { background-position: -200% 0; } }
			`}</style>

			<div className='sp sp-page'>
				{/* Header */}
				<div className='sp-header'>
					<div>
						<div className='sp-header-title'>O'quvchilar</div>
						<div className='sp-header-sub'>{total} ta ro'yxatda</div>
					</div>
					<button
						className={`sp-add-btn ${showForm ? 'cancel' : ''}`}
						onClick={() => {
							haptic.light()
							setShowForm(v => !v)
						}}
					>
						{showForm ? '✕ Yopish' : "+ Qo'shish"}
					</button>
				</div>

				{/* Filters */}
				<div className='sp-filters'>
					<div className='sp-search-wrap'>
						<span className='sp-search-icon'>🔍</span>
						<input
							className='sp-search sp'
							placeholder='Qidirish...'
							value={search}
							onChange={e => setSearch(e.target.value)}
						/>
					</div>
					<select
						className='sp-select sp'
						value={filterGroup}
						onChange={e => setFilterGroup(e.target.value)}
					>
						<option value=''>Barcha guruhlar</option>
						{groups.map(g => (
							<option key={g.id} value={g.id}>
								{g.name}
							</option>
						))}
					</select>
					<select
						className='sp-select sp'
						value={filterStatus}
						onChange={e =>
							setFilterStatus(e.target.value as StudentStatus | '')
						}
					>
						<option value=''>Barcha statuslar</option>
						{(Object.keys(statusLabel) as StudentStatus[]).map(s => (
							<option key={s} value={s}>
								{statusLabel[s]}
							</option>
						))}
					</select>
					<select
						className='sp-select sp'
						value={filterPayment}
						onChange={e =>
							setFilterPayment(e.target.value as PaymentStatus | '')
						}
					>
						<option value=''>Barcha to'lovlar</option>
						{(Object.keys(paymentLabel) as PaymentStatus[]).map(s => (
							<option key={s} value={s}>
								{paymentLabel[s]}
							</option>
						))}
					</select>
				</div>

				{/* Form */}
				{showForm && (
					<div className='sp-form-wrap' ref={formRef}>
						<div className='sp-form-header'>
							<span className='sp-form-title'>Yangi o'quvchi</span>
						</div>
						<div className='sp-form-body'>
							{/* Asosiy */}
							<div className='sp-form-section-label'>Asosiy ma'lumotlar</div>
							<div>
								<label className='sp-label'>Telegram ID *</label>
								<input
									className='sp-input sp'
									type='number'
									placeholder='123456789'
									value={form.telegram_id || ''}
									onChange={e =>
										setForm({
											...form,
											telegram_id: parseInt(e.target.value),
										})
									}
								/>
								<p className='sp-hint'>@userinfobot orqali topish mumkin</p>
							</div>
							<div className='sp-form-grid'>
								<div>
									<label className='sp-label'>Ism *</label>
									<input
										className='sp-input sp'
										placeholder='Alisher'
										value={form.first_name}
										onChange={e =>
											setForm({ ...form, first_name: e.target.value })
										}
									/>
								</div>
								<div>
									<label className='sp-label'>Familiya *</label>
									<input
										className='sp-input sp'
										placeholder='Navoiy'
										value={form.last_name}
										onChange={e =>
											setForm({ ...form, last_name: e.target.value })
										}
									/>
								</div>
							</div>
							<div className='sp-form-grid'>
								<div>
									<label className='sp-label'>Username</label>
									<input
										className='sp-input sp'
										placeholder='@alisher_n'
										value={form.username}
										onChange={e =>
											setForm({ ...form, username: e.target.value })
										}
									/>
								</div>
								<div>
									<label className='sp-label'>Telefon</label>
									<input
										className='sp-input sp'
										type='tel'
										placeholder='+998 90 123 45 67'
										value={form.phone}
										onChange={e => setForm({ ...form, phone: e.target.value })}
									/>
								</div>
							</div>

							{/* Guruh */}
							<div className='sp-form-section-label'>Guruh</div>
							<div>
								<label className='sp-label'>Guruh tanlash</label>
								<select
									className='sp-input sp'
									value={form.group_id || ''}
									onChange={e =>
										setForm({
											...form,
											group_id: e.target.value
												? Number(e.target.value)
												: undefined,
										})
									}
								>
									<option value=''>Guruhsiz</option>
									{groups.map(g => (
										<option key={g.id} value={g.id}>
											{g.name}
										</option>
									))}
								</select>
							</div>

							{/* Ota-ona */}
							<div className='sp-form-section-label'>Ota-ona ma'lumotlari</div>
							<div className='sp-form-grid'>
								<div>
									<label className='sp-label'>Ota-ona ismi</label>
									<input
										className='sp-input sp'
										placeholder='Mirzo Navoiy'
										value={form.parent_name}
										onChange={e =>
											setForm({ ...form, parent_name: e.target.value })
										}
									/>
								</div>
								<div>
									<label className='sp-label'>Ota-ona telefoni</label>
									<input
										className='sp-input sp'
										type='tel'
										placeholder='+998 90 765 43 21'
										value={form.parent_phone}
										onChange={e =>
											setForm({ ...form, parent_phone: e.target.value })
										}
									/>
								</div>
							</div>
							<div>
								<label className='sp-label'>Favqulodda aloqa</label>
								<input
									className='sp-input sp'
									type='tel'
									placeholder='+998 ...'
									value={form.emergency_contact}
									onChange={e =>
										setForm({ ...form, emergency_contact: e.target.value })
									}
								/>
							</div>

							{/* To'lov */}
							<div className='sp-form-section-label'>To'lov</div>
							<div className='sp-form-grid'>
								<div>
									<label className='sp-label'>Oylik to'lov (so'm)</label>
									<input
										className='sp-input sp'
										type='number'
										placeholder='500000'
										value={form.monthly_fee || ''}
										onChange={e =>
											setForm({
												...form,
												monthly_fee: e.target.value
													? Number(e.target.value)
													: undefined,
											})
										}
									/>
								</div>
								<div>
									<label className='sp-label'>Chegirma (%)</label>
									<input
										className='sp-input sp'
										type='number'
										placeholder='0'
										min='0'
										max='100'
										value={form.discount_percent || ''}
										onChange={e =>
											setForm({
												...form,
												discount_percent: Number(e.target.value),
											})
										}
									/>
								</div>
							</div>

							{/* Qo'shimcha */}
							<div className='sp-form-section-label'>Qo'shimcha</div>
							<div>
								<label className='sp-label'>Manzil</label>
								<input
									className='sp-input sp'
									placeholder='Toshkent, Chilonzor...'
									value={form.address}
									onChange={e => setForm({ ...form, address: e.target.value })}
								/>
							</div>
							<div>
								<label className='sp-label'>Izoh</label>
								<input
									className='sp-input sp'
									placeholder="Qo'shimcha ma'lumot..."
									value={form.notes}
									onChange={e => setForm({ ...form, notes: e.target.value })}
								/>
							</div>

							<button
								className='sp-submit-btn sp'
								onClick={handleSubmit}
								disabled={submitting}
							>
								{submitting ? 'Saqlanmoqda...' : "O'quvchi qo'shish"}
							</button>
						</div>
					</div>
				)}

				{/* List */}
				<div className='sp-list'>
					{loading ? (
						Array.from({ length: 5 }).map((_, i) => (
							<div key={i} className='sp-skeleton'>
								<div
									className='sp-skel-inner'
									style={{ animationDelay: `${i * 0.1}s` }}
								/>
							</div>
						))
					) : students.length === 0 ? (
						<div className='sp-empty'>
							<div className='sp-empty-icon'>👨‍🎓</div>
							<div className='sp-empty-title'>
								{search || filterGroup || filterStatus
									? 'Topilmadi'
									: "O'quvchilar yo'q"}
							</div>
							<div className='sp-empty-sub'>
								{search || filterGroup || filterStatus
									? "Filter yoki qidiruvni o'zgartiring"
									: "Yangi o'quvchi qo'shing"}
							</div>
						</div>
					) : (
						students.map((s, i) => {
							const group = groups.find(g => g.id === s.group_id)
							console.log(
								`=======Talaba id : ${s.id}============================`,
							)
							const enrollDays = s.enrollment_date
								? Math.floor(
										(Date.now() - new Date(s.enrollment_date).getTime()) /
											86400000,
									)
								: 0

							return (
								<div
									key={s.id}
									className={`sp-card ${visibleCards.has(s.id) ? 'visible' : ''}`}
									style={{ transitionDelay: `${i * 40}ms` }}
								>
									<Link
										href={`/admin/students/${s.id}`}
										className='sp-card-top'
									>
										{/* Avatar */}
										<div
											className='sp-avatar'
											style={{ background: avatarColor(s.id) }}
										>
											{getInitials(s.first_name, s.last_name)}
										</div>

										<div style={{ flex: 1, minWidth: 0 }}>
											<div className='sp-card-name'>
												{s.first_name} {s.last_name}
											</div>
											{s.student_id && (
												<div className='sp-card-id'>{s.student_id}</div>
											)}

											<div className='sp-card-meta'>
												{/* Status badge */}
												<span
													className='sp-badge'
													style={{
														background: `${statusColor[s.status]}22`,
														color: statusColor[s.status],
													}}
												>
													● {statusLabel[s.status]}
												</span>

												{/* Payment badge */}
												<span
													className='sp-badge'
													style={{
														background: `${paymentColor[s.payment_status]}1a`,
														color: paymentColor[s.payment_status],
													}}
												>
													💳 {paymentLabel[s.payment_status]}
												</span>

												{/* Group */}
												{group && (
													<span className='sp-tag group-tag'>
														👥 {group.name}
													</span>
												)}
											</div>

											<div
												className='sp-card-extra'
												style={{ padding: '8px 0 0' }}
											>
												{s.username && (
													<span className='sp-info-chip'>@{s.username}</span>
												)}
												{s.phone && (
													<span className='sp-info-chip'>📱 {s.phone}</span>
												)}
												{s.parent_name && (
													<span className='sp-info-chip'>
														👨‍👩‍👦 {s.parent_name}
													</span>
												)}
												{s.monthly_fee && (
													<span className='sp-info-chip'>
														💰 {s.monthly_fee.toLocaleString()} so'm
														{s.discount_percent
															? ` (-${s.discount_percent}%)`
															: ''}
													</span>
												)}
												{s.debt_amount && s.debt_amount > 0 ? (
													<span
														className='sp-info-chip'
														style={{ color: '#ff453a' }}
													>
														⚠️ Qarz: {s.debt_amount.toLocaleString()}
													</span>
												) : null}
												{enrollDays > 0 && (
													<span className='sp-info-chip'>
														📅 {enrollDays} kun
													</span>
												)}
											</div>
										</div>
									</Link>

									<div className='sp-card-footer'>
										<Link
											href={`/admin/students/1`}
											className='sp-action-btn view-btn'
										>
											👁 Ko'rish
										</Link>
										<button
											className='sp-action-btn del-btn'
											onClick={() => handleDelete(s)}
										>
											🗑 O'chirish
										</button>
									</div>
								</div>
							)
						})
					)}
				</div>

				{/* Pagination */}
				{totalPages > 1 && (
					<div className='sp-pagination'>
						<button
							className='sp-page-btn'
							onClick={() => changePage(page - 1)}
							disabled={page === 1}
						>
							‹
						</button>
						{Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
							const p = i + 1
							return (
								<button
									key={p}
									className={`sp-page-btn ${p === page ? 'active' : ''}`}
									onClick={() => changePage(p)}
								>
									{p}
								</button>
							)
						})}
						<button
							className='sp-page-btn'
							onClick={() => changePage(page + 1)}
							disabled={page === totalPages}
						>
							›
						</button>
					</div>
				)}
			</div>
		</>
	)
}

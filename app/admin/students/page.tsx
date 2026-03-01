'use client'

import { adminApi, StudentCreateData } from '@/lib/api'
import { haptic, tgAlert, tgConfirm } from '@/lib/telegram'
import { Group, PaymentStatus, Student, StudentStatus } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const STATUS_LABEL: Record<StudentStatus, string> = {
	active: 'Faol',
	inactive: 'Faol emas',
	graduated: 'Bitirgan',
	suspended: "To'xtatilgan",
	expelled: 'Chiqarilgan',
}
const STATUS_VAR: Record<StudentStatus, string> = {
	active: 'var(--tg-success)',
	inactive: 'var(--tg-hint)',
	graduated: 'var(--tg-link)',
	suspended: 'var(--tg-warning)',
	expelled: 'var(--tg-destructive)',
}
const PAY_LABEL: Record<PaymentStatus, string> = {
	paid: "To'langan",
	unpaid: "To'lanmagan",
	partial: 'Qisman',
	overdue: "Muddati o'tgan",
}
const PAY_VAR: Record<PaymentStatus, string> = {
	paid: 'var(--tg-success)',
	unpaid: 'var(--tg-destructive)',
	partial: 'var(--tg-warning)',
	overdue: 'var(--tg-destructive)',
}
const GRADS = [
	'135deg,#667eea,#764ba2',
	'135deg,#f093fb,#f5576c',
	'135deg,#4facfe,#00f2fe',
	'135deg,#43e97b,#38f9d7',
	'135deg,#fa709a,#fee140',
	'135deg,#a18cd1,#fbc2eb',
	'135deg,#fd7043,#ff8a65',
	'135deg,#26c6da,#00acc1',
]
const avatarGrad = (id: number) =>
	`linear-gradient(${GRADS[id % GRADS.length]})`
const getInitials = (f: string, l: string) =>
	`${f[0] || ''}${l[0] || ''}`.toUpperCase()

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

export default function AdminStudentsPage() {
	const router = useRouter()
	const [students, setStudents] = useState<Student[]>([])
	const [groups, setGroups] = useState<Group[]>([])
	const [loading, setLoading] = useState(true)
	const [showForm, setShowForm] = useState(false)
	const [submitting, setSubmitting] = useState(false)
	const [form, setForm] = useState(EMPTY)
	const [search, setSearch] = useState('')
	const [fGroup, setFGroup] = useState('')
	const [fStatus, setFStatus] = useState<StudentStatus | ''>('')
	const [fPay, setFPay] = useState<PaymentStatus | ''>('')
	const [page, setPage] = useState(1)
	const [totalPages, setTotalPages] = useState(1)
	const [total, setTotal] = useState(0)
	const [visible, setVisible] = useState<Set<number>>(new Set())
	const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

	const load = async (p = 1) => {
		setLoading(true)
		setVisible(new Set())
		try {
			const [sRes, gRes] = await Promise.all([
				adminApi.getStudents({
					page: p,
					size: 15,
					group_id: fGroup ? Number(fGroup) : undefined,
					status: fStatus || undefined,
					payment_status: fPay || undefined,
					search: search || undefined,
				}),
				adminApi.getGroups(1, 100),
			])
			setStudents(sRes.items)
			setTotal(sRes.total)
			setTotalPages(Math.ceil(sRes.total / 15))
			setGroups(gRes.items)
			setTimeout(() => setVisible(new Set(sRes.items.map(s => s.id))), 60)
		} catch {
			await tgAlert("Ma'lumotlarni yuklab bo'lmadi!")
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		load(1)
		setPage(1)
	}, [fGroup, fStatus, fPay]) // eslint-disable-line
	useEffect(() => {
		if (searchTimer.current) clearTimeout(searchTimer.current)
		searchTimer.current = setTimeout(() => {
			load(1)
			setPage(1)
		}, 380)
	}, [search]) // eslint-disable-line

	const goPage = (p: number) => {
		setPage(p)
		load(p)
	}

	const handleSubmit = async () => {
		if (!form.telegram_id || !form.first_name || !form.last_name)
			return tgAlert('Telegram ID, ism va familiya majburiy!')
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

	const handleDelete = async (s: Student, e: React.MouseEvent) => {
		e.stopPropagation()
		if (!(await tgConfirm(`${s.first_name} ${s.last_name} ni o'chirish?`)))
			return
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

	return (
		<>
			<style>{CSS}</style>
			<div className='sp'>
				{/* ── Header ── */}
				<header className='sp-header'>
					<div>
						<h1 className='sp-title'>O'quvchilar</h1>
						<p className='sp-sub'>{total} ta ro'yxatda</p>
					</div>
					<button
						className={`sp-add-btn${showForm ? ' sp-add-btn--x' : ''}`}
						onClick={() => {
							haptic.light()
							setShowForm(v => !v)
						}}
					>
						{showForm ? '✕' : "+ Qo'shish"}
					</button>
				</header>

				{/* ── Filters ── */}
				<div className='sp-filters'>
					<div className='sp-search-wrap'>
						<span className='sp-search-ico'>🔍</span>
						<input
							className='sp-search'
							placeholder='Qidirish...'
							value={search}
							onChange={e => setSearch(e.target.value)}
						/>
					</div>
					<div className='sp-chips'>
						<select
							className='sp-chip'
							value={fGroup}
							onChange={e => setFGroup(e.target.value)}
						>
							<option value=''>Barcha guruhlar</option>
							{groups.map(g => (
								<option key={g.id} value={g.id}>
									{g.name}
								</option>
							))}
						</select>
						<select
							className='sp-chip'
							value={fStatus}
							onChange={e => setFStatus(e.target.value as StudentStatus | '')}
						>
							<option value=''>Status</option>
							{(Object.keys(STATUS_LABEL) as StudentStatus[]).map(s => (
								<option key={s} value={s}>
									{STATUS_LABEL[s]}
								</option>
							))}
						</select>
						<select
							className='sp-chip'
							value={fPay}
							onChange={e => setFPay(e.target.value as PaymentStatus | '')}
						>
							<option value=''>To'lov</option>
							{(Object.keys(PAY_LABEL) as PaymentStatus[]).map(s => (
								<option key={s} value={s}>
									{PAY_LABEL[s]}
								</option>
							))}
						</select>
					</div>
				</div>

				{/* ── Add Form ── */}
				{showForm && (
					<div className='sp-form'>
						<p className='sp-form-sec'>Asosiy ma'lumotlar</p>
						<div className='sp-field'>
							<label className='sp-label'>Telegram ID *</label>
							<input
								className='sp-inp'
								type='number'
								placeholder='123456789'
								value={form.telegram_id || ''}
								onChange={e =>
									setForm({
										...form,
										telegram_id: e.target.value as unknown as number,
									})
								}
							/>
							<span className='sp-hint'>@userinfobot orqali topish mumkin</span>
						</div>
						<div className='sp-row2'>
							<div className='sp-field'>
								<label className='sp-label'>Ism *</label>
								<input
									className='sp-inp'
									placeholder='Alisher'
									value={form.first_name}
									onChange={e =>
										setForm({ ...form, first_name: e.target.value })
									}
								/>
							</div>
							<div className='sp-field'>
								<label className='sp-label'>Familiya *</label>
								<input
									className='sp-inp'
									placeholder='Navoiy'
									value={form.last_name}
									onChange={e =>
										setForm({ ...form, last_name: e.target.value })
									}
								/>
							</div>
						</div>
						<div className='sp-row2'>
							<div className='sp-field'>
								<label className='sp-label'>Username</label>
								<input
									className='sp-inp'
									placeholder='@username'
									value={form.username}
									onChange={e => setForm({ ...form, username: e.target.value })}
								/>
							</div>
							<div className='sp-field'>
								<label className='sp-label'>Telefon</label>
								<input
									className='sp-inp'
									type='tel'
									placeholder='+998 90...'
									value={form.phone}
									onChange={e => setForm({ ...form, phone: e.target.value })}
								/>
							</div>
						</div>

						<p className='sp-form-sec'>Guruh & To'lov</p>
						<div className='sp-field'>
							<label className='sp-label'>Guruh</label>
							<select
								className='sp-inp'
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
						<div className='sp-row2'>
							<div className='sp-field'>
								<label className='sp-label'>Oylik to'lov (so'm)</label>
								<input
									className='sp-inp'
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
							<div className='sp-field'>
								<label className='sp-label'>Chegirma %</label>
								<input
									className='sp-inp'
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

						<p className='sp-form-sec'>Ota-ona</p>
						<div className='sp-row2'>
							<div className='sp-field'>
								<label className='sp-label'>Ota-ona ismi</label>
								<input
									className='sp-inp'
									placeholder='Mirzo Navoiy'
									value={form.parent_name}
									onChange={e =>
										setForm({ ...form, parent_name: e.target.value })
									}
								/>
							</div>
							<div className='sp-field'>
								<label className='sp-label'>Ota-ona tel</label>
								<input
									className='sp-inp'
									type='tel'
									placeholder='+998...'
									value={form.parent_phone}
									onChange={e =>
										setForm({ ...form, parent_phone: e.target.value })
									}
								/>
							</div>
						</div>
						<div className='sp-field'>
							<label className='sp-label'>Manzil</label>
							<input
								className='sp-inp'
								placeholder='Toshkent, ...'
								value={form.address}
								onChange={e => setForm({ ...form, address: e.target.value })}
							/>
						</div>
						<div className='sp-field'>
							<label className='sp-label'>Izoh</label>
							<input
								className='sp-inp'
								placeholder="Qo'shimcha..."
								value={form.notes}
								onChange={e => setForm({ ...form, notes: e.target.value })}
							/>
						</div>
						<button
							className='sp-submit'
							onClick={handleSubmit}
							disabled={submitting}
						>
							{submitting ? '⏳ Saqlanmoqda...' : "✓ O'quvchi qo'shish"}
						</button>
					</div>
				)}

				{/* ── List ── */}
				<main className='sp-list'>
					{loading ? (
						Array.from({ length: 5 }).map((_, i) => (
							<div
								key={i}
								className='sp-skel'
								style={{ animationDelay: `${i * 80}ms` }}
							/>
						))
					) : students.length === 0 ? (
						<div className='sp-empty'>
							<div style={{ fontSize: 52 }}>👨‍🎓</div>
							<p className='sp-empty-t'>
								{search || fGroup || fStatus ? 'Topilmadi' : "O'quvchilar yo'q"}
							</p>
							<p className='sp-empty-s'>
								{search || fGroup || fStatus
									? "Filterni o'zgartiring"
									: "Yangi o'quvchi qo'shing"}
							</p>
						</div>
					) : (
						students.map((s, i) => {
							const grp = groups.find(g => g.id === s.group_id)
							const days = s.enrollment_date
								? Math.floor(
										(Date.now() - new Date(s.enrollment_date).getTime()) /
											86400000,
									)
								: 0
							return (
								<div
									key={s.id}
									className={`sp-card${visible.has(s.id) ? ' sp-card--in' : ''}`}
									style={{ transitionDelay: `${i * 42}ms` }}
									onClick={() => {
										haptic.light()
										router.push(`/admin/students/${Number(s.id)}`)
									}}
								>
									<div className='sp-card-body'>
										<div
											className='sp-avatar'
											style={{ background: avatarGrad(s.id) }}
										>
											{getInitials(s.first_name, s.last_name)}
										</div>
										<div className='sp-info'>
											<p className='sp-name'>
												{s.first_name} {s.last_name}
											</p>
											{s.student_id && <p className='sp-sid'>{s.student_id}</p>}
											<div className='sp-badges'>
												<span
													className='sp-badge'
													style={{
														color: STATUS_VAR[s.status],
														background: `color-mix(in srgb,${STATUS_VAR[s.status]} 12%,transparent)`,
													}}
												>
													● {STATUS_LABEL[s.status]}
												</span>
												<span
													className='sp-badge'
													style={{
														color: PAY_VAR[s.payment_status],
														background: `color-mix(in srgb,${PAY_VAR[s.payment_status]} 12%,transparent)`,
													}}
												>
													💳 {PAY_LABEL[s.payment_status]}
												</span>
												{grp && (
													<span className='sp-badge sp-badge--g'>
														👥 {grp.name}
													</span>
												)}
											</div>
											<div className='sp-meta'>
												{s.username && <span>@{s.username}</span>}
												{s.phone && <span>📱 {s.phone}</span>}
												{s.monthly_fee && (
													<span>
														💰 {s.monthly_fee.toLocaleString()}
														{s.discount_percent
															? ` (-${s.discount_percent}%)`
															: ''}
													</span>
												)}
												{(s.debt_amount ?? 0) > 0 && (
													<span className='sp-debt'>
														⚠️ Qarz: {(s.debt_amount ?? 0).toLocaleString()}
													</span>
												)}
												{days > 0 && <span>📅 {days} kun</span>}
											</div>
										</div>
										<svg className='sp-chev' viewBox='0 0 8 14' fill='none'>
											<path
												d='M1 1l6 6-6 6'
												stroke='currentColor'
												strokeWidth='1.5'
												strokeLinecap='round'
												strokeLinejoin='round'
											/>
										</svg>
									</div>
									<div
										className='sp-card-foot'
										onClick={e => e.stopPropagation()}
									>
										<button
											className='sp-del'
											onClick={e => handleDelete(s, e)}
										>
											🗑 O'chirish
										</button>
									</div>
								</div>
							)
						})
					)}
				</main>

				{totalPages > 1 && (
					<nav className='sp-pager'>
						<button
							className='sp-pager-btn'
							disabled={page === 1}
							onClick={() => goPage(page - 1)}
						>
							‹
						</button>
						{Array.from(
							{ length: Math.min(totalPages, 7) },
							(_, i) => i + 1,
						).map(p => (
							<button
								key={p}
								className={`sp-pager-btn${p === page ? ' sp-pager-btn--on' : ''}`}
								onClick={() => goPage(p)}
							>
								{p}
							</button>
						))}
						<button
							className='sp-pager-btn'
							disabled={page === totalPages}
							onClick={() => goPage(page + 1)}
						>
							›
						</button>
					</nav>
				)}
			</div>
		</>
	)
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap');
:root {
  --tg-bg:          var(--tg-theme-bg-color,#fff);
  --tg-secondary:   var(--tg-theme-secondary-bg-color,#f2f2f7);
  --tg-text:        var(--tg-theme-text-color,#000);
  --tg-hint:        var(--tg-theme-hint-color,#8e8e93);
  --tg-link:        var(--tg-theme-link-color,#007aff);
  --tg-button:      var(--tg-theme-button-color,#007aff);
  --tg-btn-text:    var(--tg-theme-button-text-color,#fff);
  --tg-destructive: var(--tg-theme-destructive-text-color,#ff3b30);
  --tg-section:     var(--tg-theme-section-bg-color,#fff);
  --tg-sep:         var(--tg-theme-section_separator_color,rgba(0,0,0,.08));
  --tg-subtitle:    var(--tg-theme-subtitle-text-color,#6d6d72);
  --tg-success: #30d158; --tg-warning: #ff9500;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
.sp{font-family:'Nunito',-apple-system,sans-serif;background:var(--tg-bg);color:var(--tg-text);min-height:100vh;display:flex;flex-direction:column;}

/* header */
.sp-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 10px;background:var(--tg-section);border-bottom:1px solid var(--tg-sep);position:sticky;top:0;z-index:40;backdrop-filter:blur(14px);}
.sp-title{font-size:22px;font-weight:900;letter-spacing:-.4px;}
.sp-sub{font-size:12px;color:var(--tg-hint);margin-top:1px;}
.sp-add-btn{padding:8px 18px;background:var(--tg-button);color:var(--tg-btn-text);border:none;border-radius:22px;font-family:'Nunito',sans-serif;font-size:14px;font-weight:800;cursor:pointer;transition:all .18s;box-shadow:0 3px 10px color-mix(in srgb,var(--tg-button) 35%,transparent);}
.sp-add-btn:active{transform:scale(.95);}
.sp-add-btn--x{background:var(--tg-secondary);color:var(--tg-text);box-shadow:none;}

/* filters */
.sp-filters{padding:10px 12px;display:flex;flex-direction:column;gap:7px;background:var(--tg-section);border-bottom:1px solid var(--tg-sep);}
.sp-search-wrap{position:relative;}
.sp-search-ico{position:absolute;left:11px;top:50%;transform:translateY(-50%);font-size:14px;pointer-events:none;}
.sp-search{width:100%;padding:9px 12px 9px 32px;background:var(--tg-secondary);border:1.5px solid transparent;border-radius:12px;font-family:'Nunito',sans-serif;font-size:14px;color:var(--tg-text);outline:none;transition:border-color .2s;}
.sp-search:focus{border-color:color-mix(in srgb,var(--tg-button) 50%,transparent);}
.sp-chips{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;}
.sp-chips::-webkit-scrollbar{display:none;}
.sp-chip{flex-shrink:0;padding:7px 10px;background:var(--tg-secondary);border:1.5px solid transparent;border-radius:10px;font-family:'Nunito',sans-serif;font-size:13px;color:var(--tg-text);outline:none;cursor:pointer;transition:border-color .2s;}
.sp-chip:focus{border-color:color-mix(in srgb,var(--tg-button) 50%,transparent);}

/* form */
.sp-form{margin:12px;background:var(--tg-section);border:1.5px solid var(--tg-sep);border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:10px;animation:sDown .28s cubic-bezier(.16,1,.3,1);}
@keyframes sDown{from{opacity:0;transform:translateY(-10px);}to{opacity:1;transform:translateY(0);}}
.sp-form-sec{font-size:11px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--tg-hint);}
.sp-field{display:flex;flex-direction:column;}
.sp-label{font-size:12px;font-weight:700;color:var(--tg-subtitle);margin-bottom:4px;}
.sp-inp{width:100%;padding:10px 13px;background:var(--tg-secondary);border:1.5px solid transparent;border-radius:12px;font-family:'Nunito',sans-serif;font-size:14px;color:var(--tg-text);outline:none;transition:border-color .2s,background .2s;}
.sp-inp:focus{border-color:color-mix(in srgb,var(--tg-button) 55%,transparent);}
.sp-hint{font-size:11px;color:var(--tg-hint);margin-top:3px;}
.sp-row2{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.sp-submit{width:100%;padding:13px;background:var(--tg-button);color:var(--tg-btn-text);border:none;border-radius:14px;font-family:'Nunito',sans-serif;font-size:15px;font-weight:800;cursor:pointer;margin-top:4px;transition:all .18s;box-shadow:0 4px 14px color-mix(in srgb,var(--tg-button) 38%,transparent);}
.sp-submit:disabled{opacity:.55;cursor:not-allowed;}
.sp-submit:not(:disabled):active{transform:scale(.98);}

/* list */
.sp-list{padding:12px;flex:1;}

/* card */
.sp-card{background:var(--tg-section);border:1.5px solid var(--tg-sep);border-radius:18px;margin-bottom:10px;overflow:hidden;cursor:pointer;opacity:0;transform:translateY(12px) scale(.99);transition:opacity .3s ease,transform .3s ease,border-color .2s,box-shadow .2s;}
.sp-card--in{opacity:1;transform:translateY(0) scale(1);}
.sp-card:hover{border-color:color-mix(in srgb,var(--tg-button) 30%,transparent);box-shadow:0 4px 18px rgba(0,0,0,.07);}
.sp-card:active{transform:scale(.99);}
.sp-card-body{padding:13px 12px 9px;display:flex;gap:11px;align-items:flex-start;}
.sp-avatar{width:50px;height:50px;border-radius:14px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:#fff;box-shadow:0 3px 10px rgba(0,0,0,.18);}
.sp-info{flex:1;min-width:0;}
.sp-name{font-size:16px;font-weight:800;line-height:1.2;}
.sp-sid{font-size:11px;color:var(--tg-hint);margin-top:2px;}
.sp-badges{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px;}
.sp-badge{padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;}
.sp-badge--g{background:color-mix(in srgb,var(--tg-link) 12%,transparent);color:var(--tg-link);}
.sp-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;font-size:12px;color:var(--tg-subtitle);}
.sp-debt{color:var(--tg-destructive)!important;font-weight:700;}
.sp-chev{width:8px;height:14px;color:var(--tg-hint);flex-shrink:0;margin-top:5px;}
.sp-card-foot{padding:7px 12px 11px;display:flex;gap:8px;border-top:1px solid var(--tg-sep);}
.sp-del{flex:1;padding:8px;background:color-mix(in srgb,var(--tg-destructive) 10%,transparent);color:var(--tg-destructive);border:none;border-radius:11px;font-family:'Nunito',sans-serif;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;}
.sp-del:active{transform:scale(.96);}

/* skeleton */
.sp-skel{height:130px;border-radius:18px;margin-bottom:10px;background:linear-gradient(90deg,color-mix(in srgb,var(--tg-hint) 7%,transparent) 0%,color-mix(in srgb,var(--tg-hint) 13%,transparent) 50%,color-mix(in srgb,var(--tg-hint) 7%,transparent) 100%);background-size:200% 100%;animation:shimmer 1.4s infinite;}
@keyframes shimmer{to{background-position:-200% 0;}}

/* empty */
.sp-empty{text-align:center;padding:56px 24px;}
.sp-empty-t{font-size:18px;font-weight:800;margin-top:10px;}
.sp-empty-s{font-size:13px;color:var(--tg-hint);margin-top:5px;}

/* pagination */
.sp-pager{display:flex;justify-content:center;gap:6px;padding:8px 12px 24px;}
.sp-pager-btn{min-width:36px;height:36px;padding:0 10px;background:var(--tg-secondary);border:1.5px solid var(--tg-sep);border-radius:10px;font-family:'Nunito',sans-serif;font-size:13px;font-weight:700;color:var(--tg-text);cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center;}
.sp-pager-btn:hover{border-color:color-mix(in srgb,var(--tg-button) 50%,transparent);color:var(--tg-button);}
.sp-pager-btn--on{background:var(--tg-button);color:var(--tg-btn-text);border-color:transparent;box-shadow:0 3px 10px color-mix(in srgb,var(--tg-button) 38%,transparent);}
.sp-pager-btn:disabled{opacity:.35;cursor:not-allowed;}
`

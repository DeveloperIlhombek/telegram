'use client'

import { adminApi, StudentUpdateData } from '@/lib/api'
import { haptic, tgAlert, tgConfirm } from '@/lib/telegram'
import {
	AttendanceRecord,
	Group,
	PaymentStatus,
	Student,
	StudentStatus,
} from '@/lib/types'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

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
	overdue: "Muddati o'tgan",
}
const attColor: Record<string, string> = {
	present: '#30d158',
	absent: '#ff3b30',
	late: '#ff9500',
}
const attLabel: Record<string, string> = {
	present: 'Keldi',
	absent: 'Kelmadi',
	late: 'Kech keldi',
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
function getInitials(f: string, l: string) {
	return `${f[0] || ''}${l[0] || ''}`.toUpperCase()
}

function formatDate(d: string) {
	return new Date(d).toLocaleDateString('uz-UZ', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	})
}

// ─── tabs ─────────────────────────────────────────────────────────────────────
type Tab = 'info' | 'attendance' | 'payment' | 'edit'

// ─── component ────────────────────────────────────────────────────────────────
export default function StudentDetailPage() {
	const router = useRouter()
	const params = useParams()
	const id = Array.isArray(params.id) ? params.id[0] : params.id
	// const studentId = id ? parseInt(id, 10) : NaN
	const studentId = id && !isNaN(Number(id)) ? Number(id) : 1
	const [student, setStudent] = useState<Student | null>(null)
	const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
	const [groups, setGroups] = useState<Group[]>([])
	const [loading, setLoading] = useState(true)
	const [tab, setTab] = useState<Tab>('info')
	const [mounted, setMounted] = useState(false)
	const [editData, setEditData] = useState<StudentUpdateData>({})
	const [saving, setSaving] = useState(false)
	const [attStats, setAttStats] = useState({
		total: 0,
		present: 0,
		absent: 0,
		late: 0,
	})
	// =====================================================================
	useEffect(() => {
		if (isNaN(studentId) || studentId <= 0) {
			console.warn('Noto‘g‘ri studentId:', studentId)
			return
		}
		loadAll()
		setTimeout(() => setMounted(true), 50)
	}, [studentId])
	// =====================================================================
	useEffect(() => {
		loadAll()
		setTimeout(() => setMounted(true), 50)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [studentId])

	const loadAll = async () => {
		setLoading(true)
		try {
			const [sRes, gRes, attRes] = await Promise.all([
				adminApi.getStudent(studentId),
				adminApi.getGroups(1, 100),
				adminApi
					.getStudentAttendance(studentId)
					.catch(() => ({ items: [] as AttendanceRecord[] })),
			])
			setStudent(sRes)
			setGroups(gRes.items)
			const records = attRes.items || []
			setAttendance(records)
			setEditData({
				first_name: sRes.first_name,
				last_name: sRes.last_name,
				phone: sRes.phone,
				group_id: sRes.group_id ?? undefined,
				parent_name: sRes.parent_name,
				parent_phone: sRes.parent_phone,
				emergency_contact: sRes.emergency_contact,
				address: sRes.address,
				notes: sRes.notes,
				monthly_fee: sRes.monthly_fee ?? undefined,
				discount_percent: sRes.discount_percent,
				payment_status: sRes.payment_status,
				debt_amount: sRes.debt_amount,
				status: sRes.status,
				is_active: sRes.is_active,
			})
			setAttStats({
				total: records.length,
				present: records.filter(r => r.status === 'present').length,
				absent: records.filter(r => r.status === 'absent').length,
				late: records.filter(r => r.status === 'late').length,
			})
		} catch (e) {
			console.error(e)
		} finally {
			setLoading(false)
		}
	}

	const handleSave = async () => {
		if (!student) return
		setSaving(true)
		haptic.medium()
		try {
			await adminApi.updateStudent(studentId, editData)
			haptic.success()
			loadAll()
			setTab('info')
		} catch (err) {
			haptic.error()
			await tgAlert(err instanceof Error ? err.message : 'Xatolik!')
		} finally {
			setSaving(false)
		}
	}

	const handleDelete = async () => {
		if (!student) return
		const ok = await tgConfirm(
			`${student.first_name} ${student.last_name} ni o'chirish?`,
		)
		if (!ok) return
		haptic.medium()
		try {
			await adminApi.deleteStudent(studentId)
			haptic.success()
			router.back()
		} catch {
			haptic.error()
			await tgAlert("O'chirib bo'lmadi!")
		}
	}

	const pct =
		attStats.total > 0
			? Math.round((attStats.present / attStats.total) * 100)
			: 0
	const pctColor = pct >= 80 ? '#30d158' : pct >= 60 ? '#ff9500' : '#ff3b30'

	// ── loading ────────────────────────────────────────────────────────────────
	if (loading)
		return (
			<>
				<style>{skeletonCss}</style>
				<div className='sd sd-page'>
					<div className='sd-header'>
						<button className='sd-back-btn' onClick={() => router.back()}>
							← Orqaga
						</button>
					</div>
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							key={i}
							className='sd-skel'
							style={{
								margin: '16px',
								height: i === 0 ? 180 : 80,
								animationDelay: `${i * 0.1}s`,
							}}
						/>
					))}
				</div>
			</>
		)

	if (!student)
		return (
			<>
				<style>{skeletonCss}</style>
				<div
					className='sd sd-page'
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						height: '100vh',
					}}
				>
					<div style={{ textAlign: 'center', color: 'rgba(255,255,255,.4)' }}>
						<div style={{ fontSize: 52 }}>❌</div>
						<div style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>
							O'quvchi topilmadi
						</div>
						<button
							className='sd-back-btn'
							style={{ marginTop: 20 }}
							onClick={() => router.back()}
						>
							Orqaga
						</button>
					</div>
				</div>
			</>
		)

	const initials = getInitials(student.first_name, student.last_name)

	return (
		<>
			<style>{css}</style>
			<div className={`sd sd-page ${mounted ? 'mounted' : ''}`}>
				{/* ── Header ── */}
				<div className='sd-header'>
					<button
						className='sd-back-btn'
						onClick={() => {
							haptic.light()
							router.back()
						}}
					>
						← Orqaga
					</button>
					<span className='sd-header-title'>O'quvchi profili</span>
					<div style={{ width: 80 }} />
				</div>

				<div className='sd-scroll'>
					{/* ── Hero card ── */}
					<div className='sd-hero'>
						<div
							className='sd-hero-bg'
							style={{ background: avatarColor(student.id) }}
						/>
						<div className='sd-hero-content'>
							<div
								className='sd-hero-avatar'
								style={{ background: avatarColor(student.id) }}
							>
								{initials}
							</div>
							<h1 className='sd-hero-name'>
								{student.first_name} {student.last_name}
							</h1>
							{student.student_id && (
								<p className='sd-hero-id'>{student.student_id}</p>
							)}
							<div className='sd-hero-badges'>
								<span
									className='sd-badge'
									style={{
										background: `${statusColor[student.status]}22`,
										color: statusColor[student.status],
										border: `1px solid ${statusColor[student.status]}44`,
									}}
								>
									● {statusLabel[student.status]}
								</span>
								<span
									className='sd-badge'
									style={{
										background: `${paymentColor[student.payment_status]}22`,
										color: paymentColor[student.payment_status],
										border: `1px solid ${paymentColor[student.payment_status]}44`,
									}}
								>
									💳 {paymentLabel[student.payment_status]}
								</span>
							</div>
						</div>
					</div>

					{/* ── Attendance percent ── */}
					<div className='sd-attend-card'>
						<div className='sd-attend-pct' style={{ color: pctColor }}>
							{pct}%
						</div>
						<div className='sd-attend-label'>Davomat foizi</div>
						<div className='sd-attend-bar-track'>
							<div
								className='sd-attend-bar-fill'
								style={{ width: `${pct}%`, background: pctColor }}
							/>
						</div>
						<div className='sd-attend-grid'>
							{[
								{ label: 'Keldi', val: attStats.present, color: '#30d158' },
								{ label: 'Kelmadi', val: attStats.absent, color: '#ff3b30' },
								{ label: 'Kech', val: attStats.late, color: '#ff9500' },
								{
									label: 'Jami',
									val: attStats.total,
									color: 'rgba(255,255,255,.6)',
								},
							].map(item => (
								<div key={item.label} className='sd-attend-stat'>
									<div
										style={{ fontSize: 24, fontWeight: 800, color: item.color }}
									>
										{item.val}
									</div>
									<div
										style={{
											fontSize: 11,
											color: 'rgba(255,255,255,.4)',
											marginTop: 2,
										}}
									>
										{item.label}
									</div>
								</div>
							))}
						</div>
					</div>

					{/* ── Tabs ── */}
					<div className='sd-tabs'>
						{(['info', 'attendance', 'payment', 'edit'] as Tab[]).map(t => (
							<button
								key={t}
								className={`sd-tab ${tab === t ? 'active' : ''}`}
								onClick={() => {
									haptic.light()
									setTab(t)
								}}
							>
								{
									{
										info: '📋 Info',
										attendance: '📅 Davomat',
										payment: "💰 To'lov",
										edit: '✏️ Tahrirlash',
									}[t]
								}
							</button>
						))}
					</div>

					{/* ── Tab: Info ── */}
					{tab === 'info' && (
						<div className='sd-section sd-anim'>
							<InfoRow icon='👤' label="To'liq ism" value={student.full_name} />
							{student.username && (
								<InfoRow
									icon='📎'
									label='Username'
									value={`@${student.username}`}
								/>
							)}
							{student.phone && (
								<InfoRow icon='📱' label='Telefon' value={student.phone} />
							)}
							<InfoRow
								icon='📅'
								label="Qo'shilgan sana"
								value={formatDate(student.enrollment_date)}
							/>
							{student.group_name && (
								<InfoRow icon='👥' label='Guruh' value={student.group_name} />
							)}
							{student.parent_name && (
								<InfoRow
									icon='👨‍👩‍👦'
									label='Ota-ona'
									value={student.parent_name}
								/>
							)}
							{student.parent_phone && (
								<InfoRow
									icon='📞'
									label='Ota-ona tel'
									value={student.parent_phone}
								/>
							)}
							{student.emergency_contact && (
								<InfoRow
									icon='🚨'
									label='Favqulodda'
									value={student.emergency_contact}
								/>
							)}
							{student.address && (
								<InfoRow icon='📍' label='Manzil' value={student.address} />
							)}
							{student.notes && (
								<InfoRow icon='📝' label='Izoh' value={student.notes} />
							)}
						</div>
					)}

					{/* ── Tab: Attendance ── */}
					{tab === 'attendance' && (
						<div className='sd-anim'>
							{attendance.length === 0 ? (
								<div className='sd-empty'>
									<div style={{ fontSize: 44 }}>📅</div>
									<div style={{ fontWeight: 700, fontSize: 17, marginTop: 10 }}>
										Davomat yo'q
									</div>
									<div style={{ fontSize: 13, opacity: 0.5, marginTop: 6 }}>
										Hali davomat belgilanmagan
									</div>
								</div>
							) : (
								<div className='sd-section'>
									{attendance.map((r, i) => (
										<div
											key={r.id}
											className='sd-att-row'
											style={{
												borderBottom:
													i === attendance.length - 1
														? 'none'
														: '1px solid rgba(255,255,255,.05)',
											}}
										>
											<div>
												<div style={{ fontSize: 14, fontWeight: 600 }}>
													{formatDate(r.date)}
												</div>
												{r.note && (
													<div
														style={{
															fontSize: 12,
															color: 'rgba(255,255,255,.35)',
															marginTop: 2,
														}}
													>
														{r.note}
													</div>
												)}
											</div>
											<span
												className='sd-badge'
												style={{
													background: `${attColor[r.status]}1a`,
													color: attColor[r.status],
													border: `1px solid ${attColor[r.status]}33`,
												}}
											>
												{attLabel[r.status]}
											</span>
										</div>
									))}
								</div>
							)}
						</div>
					)}

					{/* ── Tab: Payment ── */}
					{tab === 'payment' && (
						<div className='sd-anim'>
							<div
								className='sd-payment-hero'
								style={{
									borderColor: `${paymentColor[student.payment_status]}44`,
								}}
							>
								<div
									style={{
										fontSize: 13,
										color: 'rgba(255,255,255,.4)',
										marginBottom: 4,
									}}
								>
									To'lov holati
								</div>
								<div
									style={{
										fontSize: 28,
										fontWeight: 800,
										color: paymentColor[student.payment_status],
									}}
								>
									{paymentLabel[student.payment_status]}
								</div>
								{student.debt_amount && student.debt_amount > 0 ? (
									<div style={{ fontSize: 14, color: '#ff453a', marginTop: 8 }}>
										⚠️ Qarz: {student.debt_amount.toLocaleString()} so'm
									</div>
								) : null}
							</div>
							<div className='sd-section'>
								<InfoRow
									icon='💵'
									label="Oylik to'lov"
									value={
										student.monthly_fee
											? `${student.monthly_fee.toLocaleString()} so'm`
											: 'Belgilanmagan'
									}
								/>
								{(student.discount_percent ?? 0) > 0 && (
									<InfoRow
										icon='🎁'
										label='Chegirma'
										value={`${student.discount_percent}%`}
									/>
								)}
								{student.last_payment_date && (
									<InfoRow
										icon='📆'
										label="Oxirgi to'lov"
										value={formatDate(student.last_payment_date)}
									/>
								)}
							</div>
						</div>
					)}

					{/* ── Tab: Edit ── */}
					{tab === 'edit' && (
						<div className='sd-edit-form sd-anim'>
							<div className='sd-section-label'>Shaxsiy ma'lumotlar</div>
							<div className='sd-form-grid'>
								<Field
									label='Ism'
									value={editData.first_name || ''}
									onChange={v => setEditData({ ...editData, first_name: v })}
								/>
								<Field
									label='Familiya'
									value={editData.last_name || ''}
									onChange={v => setEditData({ ...editData, last_name: v })}
								/>
							</div>
							<Field
								label='Telefon'
								value={editData.phone || ''}
								onChange={v => setEditData({ ...editData, phone: v })}
								type='tel'
							/>

							<div className='sd-section-label' style={{ marginTop: 16 }}>
								Guruh
							</div>
							<div>
								<label className='sd-label'>Guruh</label>
								<select
									className='sd-input sd'
									value={editData.group_id || ''}
									onChange={e =>
										setEditData({
											...editData,
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

							<div className='sd-section-label' style={{ marginTop: 16 }}>
								Ota-ona
							</div>
							<div className='sd-form-grid'>
								<Field
									label='Ota-ona ismi'
									value={editData.parent_name || ''}
									onChange={v => setEditData({ ...editData, parent_name: v })}
								/>
								<Field
									label='Ota-ona tel'
									value={editData.parent_phone || ''}
									onChange={v => setEditData({ ...editData, parent_phone: v })}
									type='tel'
								/>
							</div>
							<Field
								label='Favqulodda aloqa'
								value={editData.emergency_contact || ''}
								onChange={v =>
									setEditData({ ...editData, emergency_contact: v })
								}
								type='tel'
							/>
							<Field
								label='Manzil'
								value={editData.address || ''}
								onChange={v => setEditData({ ...editData, address: v })}
							/>
							<Field
								label='Izoh'
								value={editData.notes || ''}
								onChange={v => setEditData({ ...editData, notes: v })}
							/>

							<div className='sd-section-label' style={{ marginTop: 16 }}>
								To'lov
							</div>
							<div className='sd-form-grid'>
								<Field
									label="Oylik to'lov"
									value={
										editData.monthly_fee != null
											? String(editData.monthly_fee)
											: ''
									}
									type='number'
									onChange={v =>
										setEditData({
											...editData,
											monthly_fee: v ? Number(v) : undefined,
										})
									}
								/>
								<Field
									label='Chegirma %'
									value={
										editData.discount_percent != null
											? String(editData.discount_percent)
											: ''
									}
									type='number'
									onChange={v =>
										setEditData({ ...editData, discount_percent: Number(v) })
									}
								/>
							</div>
							<Field
								label='Qarz miqdori'
								value={
									editData.debt_amount != null
										? String(editData.debt_amount)
										: ''
								}
								type='number'
								onChange={v =>
									setEditData({
										...editData,
										debt_amount: v ? Number(v) : undefined,
									})
								}
							/>
							<div>
								<label className='sd-label'>To'lov holati</label>
								<select
									className='sd-input sd'
									value={editData.payment_status || ''}
									onChange={e =>
										setEditData({
											...editData,
											payment_status: e.target.value as PaymentStatus,
										})
									}
								>
									{(
										['paid', 'unpaid', 'partial', 'overdue'] as PaymentStatus[]
									).map(p => (
										<option key={p} value={p}>
											{paymentLabel[p]}
										</option>
									))}
								</select>
							</div>

							<div className='sd-section-label' style={{ marginTop: 16 }}>
								Status
							</div>
							<div>
								<label className='sd-label'>O'quvchi holati</label>
								<select
									className='sd-input sd'
									value={editData.status || 'active'}
									onChange={e =>
										setEditData({
											...editData,
											status: e.target.value as StudentStatus,
										})
									}
								>
									{(Object.keys(statusLabel) as StudentStatus[]).map(s => (
										<option key={s} value={s}>
											{statusLabel[s]}
										</option>
									))}
								</select>
							</div>

							<button
								className='sd-save-btn sd'
								onClick={handleSave}
								disabled={saving}
								style={{ marginTop: 20 }}
							>
								{saving ? 'Saqlanmoqda...' : '✓ Saqlash'}
							</button>
						</div>
					)}

					{/* ── Danger zone ── */}
					<div className='sd-danger'>
						<div className='sd-danger-title'>⚠️ Xavfli zona</div>
						<p className='sd-danger-desc'>
							O'quvchini o'chirgandan so'ng uni tiklash mumkin emas.
						</p>
						<button className='sd-del-btn' onClick={handleDelete}>
							O'quvchini o'chirish
						</button>
					</div>
				</div>
			</div>
		</>
	)
}

// ─── sub-components ───────────────────────────────────────────────────────────

function InfoRow({
	icon,
	label,
	value,
}: {
	icon: string
	label: string
	value: string
}) {
	return (
		<div className='sd-info-row'>
			<span style={{ fontSize: 18, width: 26, flexShrink: 0 }}>{icon}</span>
			<div>
				<div
					style={{
						fontSize: 11,
						color: 'rgba(255,255,255,.35)',
						marginBottom: 2,
					}}
				>
					{label}
				</div>
				<div style={{ fontSize: 15, fontWeight: 500 }}>{value}</div>
			</div>
		</div>
	)
}

function Field({
	label,
	value,
	onChange,
	type = 'text',
}: {
	label: string
	value: string
	onChange: (v: string) => void
	type?: string
}) {
	return (
		<div>
			<label className='sd-label'>{label}</label>
			<input
				className='sd-input sd'
				type={type}
				value={value}
				onChange={e => onChange(e.target.value)}
			/>
		</div>
	)
}

// ─── styles ───────────────────────────────────────────────────────────────────

const skeletonCss = `
	@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');
	.sd { font-family:'Outfit',sans-serif; }
	.sd-page { min-height:100vh; background:#0a0a0f; color:#f0f0f5; }
	.sd-header { display:flex; align-items:center; justify-content:space-between; padding:14px 18px;
		background:rgba(10,10,15,.9); backdrop-filter:blur(20px);
		border-bottom:1px solid rgba(255,255,255,.06); position:sticky; top:0; z-index:50; }
	.sd-back-btn { padding:8px 16px; background:rgba(255,255,255,.08); color:rgba(255,255,255,.7);
		border:none; border-radius:20px; font-family:'Outfit',sans-serif; font-size:14px; font-weight:600; cursor:pointer; }
	.sd-skel { border-radius:16px; background:linear-gradient(90deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.09) 50%,rgba(255,255,255,.04) 100%);
		background-size:200% 100%; animation:shim 1.4s infinite; }
	@keyframes shim { to { background-position:-200% 0; } }
`

const css = `
	@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
	*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
	.sd { font-family:'Outfit',sans-serif; }

	.sd-page {
		min-height:100vh; background:#0a0a0f; color:#f0f0f5;
		opacity:0; transform:translateY(12px);
		transition: opacity .4s ease, transform .4s ease;
	}
	.sd-page.mounted { opacity:1; transform:translateY(0); }

	/* header */
	.sd-header {
		display:flex; align-items:center; justify-content:space-between;
		padding:14px 18px;
		background:rgba(10,10,15,.9); backdrop-filter:blur(20px);
		border-bottom:1px solid rgba(255,255,255,.06);
		position:sticky; top:0; z-index:50;
	}
	.sd-header-title { font-size:17px; font-weight:700; position:absolute; left:50%; transform:translateX(-50%); }
	.sd-back-btn {
		padding:8px 16px; background:rgba(255,255,255,.08);
		color:rgba(255,255,255,.7); border:none; border-radius:20px;
		font-family:'Outfit',sans-serif; font-size:14px; font-weight:600; cursor:pointer;
		transition:all .15s; z-index:1;
	}
	.sd-back-btn:active { transform:scale(.96); }

	.sd-scroll { overflow-y:auto; }

	/* ── hero ── */
	.sd-hero {
		position:relative; overflow:hidden; padding:32px 20px 28px;
		text-align:center;
	}
	.sd-hero-bg {
		position:absolute; inset:0; opacity:.2;
		filter:blur(40px); transform:scale(1.2);
	}
	.sd-hero-content { position:relative; z-index:1; }
	.sd-hero-avatar {
		width:88px; height:88px; border-radius:28px;
		display:inline-flex; align-items:center; justify-content:center;
		font-size:32px; font-weight:800; color:#fff;
		margin-bottom:14px;
		box-shadow:0 8px 32px rgba(0,0,0,.4);
		border:3px solid rgba(255,255,255,.15);
	}
	.sd-hero-name { font-size:26px; font-weight:800; letter-spacing:-.5px; }
	.sd-hero-id {
		font-size:12px; color:rgba(255,255,255,.35);
		font-family:'SF Mono',monospace; margin-top:4px;
	}
	.sd-hero-badges { display:flex; gap:8px; justify-content:center; margin-top:12px; flex-wrap:wrap; }
	.sd-badge {
		display:inline-flex; align-items:center; gap:4px;
		padding:5px 12px; border-radius:20px;
		font-size:12px; font-weight:700;
	}

	/* ── attendance card ── */
	.sd-attend-card {
		margin:0 16px 16px; padding:20px;
		background:rgba(255,255,255,.04);
		border:1px solid rgba(255,255,255,.07);
		border-radius:20px; text-align:center;
	}
	.sd-attend-pct { font-size:52px; font-weight:800; line-height:1; }
	.sd-attend-label { font-size:13px; color:rgba(255,255,255,.4); margin-top:4px; }
	.sd-attend-bar-track {
		height:6px; background:rgba(255,255,255,.08);
		border-radius:3px; margin:14px 0 16px; overflow:hidden;
	}
	.sd-attend-bar-fill { height:100%; border-radius:3px; transition:width .6s cubic-bezier(.4,0,.2,1); }
	.sd-attend-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
	.sd-attend-stat { background:rgba(255,255,255,.04); border-radius:12px; padding:12px 6px; }

	/* ── tabs ── */
	.sd-tabs {
		display:flex; gap:6px; padding:0 16px 12px;
		overflow-x:auto; scrollbar-width:none;
	}
	.sd-tabs::-webkit-scrollbar { display:none; }
	.sd-tab {
		padding:8px 16px; border-radius:20px; border:1px solid rgba(255,255,255,.1);
		background:rgba(255,255,255,.05); color:rgba(255,255,255,.5);
		font-family:'Outfit',sans-serif; font-size:13px; font-weight:600;
		cursor:pointer; white-space:nowrap; transition:all .2s; flex-shrink:0;
	}
	.sd-tab.active {
		background:linear-gradient(135deg,#6366f1,#8b5cf6);
		border-color:transparent; color:#fff;
		box-shadow:0 4px 16px rgba(99,102,241,.4);
	}

	/* ── section ── */
	.sd-section {
		margin:0 16px 16px;
		background:rgba(255,255,255,.04);
		border:1px solid rgba(255,255,255,.07);
		border-radius:20px; overflow:hidden;
	}
	.sd-section-label {
		font-size:11px; font-weight:700; letter-spacing:1px;
		text-transform:uppercase; color:rgba(255,255,255,.3);
		margin-bottom:8px;
	}
	.sd-anim { animation:fadeUp .3s cubic-bezier(.16,1,.3,1); }
	@keyframes fadeUp {
		from { opacity:0; transform:translateY(10px); }
		to   { opacity:1; transform:translateY(0); }
	}

	/* info rows */
	.sd-info-row {
		display:flex; gap:12px; align-items:flex-start;
		padding:14px 16px;
		border-bottom:1px solid rgba(255,255,255,.05);
	}
	.sd-info-row:last-child { border-bottom:none; }

	/* attendance rows */
	.sd-att-row {
		display:flex; align-items:center; justify-content:space-between;
		padding:13px 16px;
	}

	/* payment hero */
	.sd-payment-hero {
		margin:0 16px 12px; padding:20px;
		background:rgba(255,255,255,.04);
		border:1px solid; border-radius:20px; text-align:center;
	}

	/* edit form */
	.sd-edit-form { padding:0 16px 16px; display:flex; flex-direction:column; gap:12px; }
	.sd-label { display:block; font-size:12px; font-weight:600; color:rgba(255,255,255,.4); margin-bottom:5px; }
	.sd-input {
		width:100%; padding:11px 14px;
		background:rgba(255,255,255,.07);
		border:1px solid rgba(255,255,255,.08);
		border-radius:12px;
		font-size:14px; color:#f0f0f5;
		outline:none; transition:border-color .2s;
	}
	.sd-input:focus { border-color:rgba(99,102,241,.6); background:rgba(255,255,255,.1); }
	.sd-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
	.sd-save-btn {
		width:100%; padding:14px;
		background:linear-gradient(135deg,#6366f1,#8b5cf6);
		color:#fff; border:none; border-radius:14px;
		font-size:15px; font-weight:700; cursor:pointer;
		box-shadow:0 6px 24px rgba(99,102,241,.4);
		transition:all .2s;
	}
	.sd-save-btn:disabled { opacity:.6; cursor:not-allowed; }
	.sd-save-btn:not(:disabled):active { transform:scale(.98); }

	/* danger */
	.sd-danger {
		margin:0 16px 32px; padding:18px;
		background:rgba(255,59,48,.06);
		border:1px solid rgba(255,59,48,.2);
		border-radius:20px;
	}
	.sd-danger-title { font-size:15px; font-weight:700; color:#ff453a; margin-bottom:6px; }
	.sd-danger-desc { font-size:13px; color:rgba(255,255,255,.4); margin-bottom:14px; }
	.sd-del-btn {
		width:100%; padding:12px;
		background:#ff3b30; color:#fff; border:none;
		border-radius:12px; font-family:'Outfit',sans-serif;
		font-size:14px; font-weight:700; cursor:pointer;
		transition:all .15s;
	}
	.sd-del-btn:active { transform:scale(.97); }

	/* empty */
	.sd-empty { text-align:center; padding:48px 24px; color:rgba(255,255,255,.35); }
`

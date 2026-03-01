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
import { useParams, usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

// ─── constants ────────────────────────────────────────────────────────────────
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
const ATT_VAR: Record<string, string> = {
	present: 'var(--tg-success)',
	absent: 'var(--tg-destructive)',
	late: 'var(--tg-warning)',
}
const ATT_LABEL: Record<string, string> = {
	present: 'Keldi',
	absent: 'Kelmadi',
	late: 'Kech keldi',
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
const fmtDate = (d: string) =>
	new Date(d).toLocaleDateString('uz-UZ', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	})
const fmtNum = (n: number) => n.toLocaleString('uz-UZ')

type Tab = 'info' | 'attendance' | 'payment' | 'edit'
const TABS: { key: Tab; label: string }[] = [
	{ key: 'info', label: '📋 Info' },
	{ key: 'attendance', label: '📅 Davomat' },
	{ key: 'payment', label: "💰 To'lov" },
	{ key: 'edit', label: '✏️ Tahrirlash' },
]

// ─── component ────────────────────────────────────────────────────────────────
export default function StudentDetailPage() {
	const router = useRouter()
	const params = useParams()
	const pathname = usePathname()

	// ✅ NaN fix: safely parse id
	const rawId = Array.isArray(params?.id) ? params.id[0] : (params?.id ?? '')
	console.log(`raw id : ${rawId}`)

	const studentId = rawId && !isNaN(Number(rawId)) ? parseInt(rawId, 10) : null
	console.log(`Student ID ${studentId}`)

	console.log(`Params ID ${params.id}`)
	console.log('NIma qilish kerak eeee')

	// console.log(studentId)

	const [student, setStudent] = useState<Student | null>(null)
	const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
	const [groups, setGroups] = useState<Group[]>([])
	const [loading, setLoading] = useState(true)
	const [tab, setTab] = useState<Tab>('info')
	const [mounted, setMounted] = useState(false)
	const [saving, setSaving] = useState(false)
	const [editData, setEditData] = useState<StudentUpdateData>({})
	const [attStats, setAttStats] = useState({
		total: 0,
		present: 0,
		absent: 0,
		late: 0,
	})
	const path = Number(pathname.split('/')[3])
	console.log(`Umumiy path name ${pathname}`)

	console.log(`path ning qiymai ${path}`)
	console.log(typeof path + 'Bu path typi')
	useEffect(() => {
		// ✅ guard: don't fetch if id is invalid
		if (!studentId) {
			setLoading(false)
			return
		}
		loadAll()
		setTimeout(() => setMounted(true), 60)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [studentId])

	const loadAll = async () => {
		if (!studentId) return
		setLoading(true)
		try {
			const [sRes, gRes, attRes] = await Promise.all([
				adminApi.getStudent(path),
				adminApi.getGroups(1, 100),
				adminApi
					.getStudentAttendance(studentId)
					.catch(() => ({ items: [] as AttendanceRecord[] })),
			])
			setStudent(sRes)
			setGroups(gRes.items)
			const recs = attRes.items || []
			setAttendance(recs)
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
				total: recs.length,
				present: recs.filter(r => r.status === 'present').length,
				absent: recs.filter(r => r.status === 'absent').length,
				late: recs.filter(r => r.status === 'late').length,
			})
		} catch (e) {
			console.error(e)
		} finally {
			setLoading(false)
		}
	}

	const handleSave = async () => {
		if (!studentId) return
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
		if (!student || !studentId) return
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
	const pctVar =
		pct >= 80
			? 'var(--tg-success)'
			: pct >= 60
				? 'var(--tg-warning)'
				: 'var(--tg-destructive)'

	// ── invalid id ────────────────────────────────────────────────────────────
	if (!studentId)
		return (
			<>
				<style>{BASE_CSS}</style>
				<div className='sd'>
					<header className='sd-header'>
						<button className='sd-back' onClick={() => router.back()}>
							← Orqaga
						</button>
					</header>
					<div className='sd-error'>
						<div style={{ fontSize: 52 }}>❌</div>
						<p className='sd-error-t'>Noto'g'ri ID</p>
						<p className='sd-error-s'>Student ID topilmadi</p>
					</div>
				</div>
			</>
		)

	// ── loading ────────────────────────────────────────────────────────────────
	if (loading)
		return (
			<>
				<style>{BASE_CSS}</style>
				<div className='sd'>
					<header className='sd-header'>
						<button className='sd-back' onClick={() => router.back()}>
							← Orqaga
						</button>
						<span className='sd-header-title'>O'quvchi profili</span>
						<div style={{ width: 80 }} />
					</header>
					{[200, 80, 56, 56, 80].map((h, i) => (
						<div
							key={i}
							className='sd-skel'
							style={{
								margin: '12px 16px 0',
								height: h,
								animationDelay: `${i * 80}ms`,
							}}
						/>
					))}
				</div>
			</>
		)

	// ── not found ─────────────────────────────────────────────────────────────
	if (!student)
		return (
			<>
				<style>{BASE_CSS}</style>
				<div className='sd'>
					<header className='sd-header'>
						<button className='sd-back' onClick={() => router.back()}>
							← Orqaga
						</button>
					</header>
					<div className='sd-error'>
						<div style={{ fontSize: 52 }}>🔍</div>
						<p className='sd-error-t'>O'quvchi topilmadi</p>
					</div>
				</div>
			</>
		)

	const ini = getInitials(student.first_name, student.last_name)

	// ── main ──────────────────────────────────────────────────────────────────
	return (
		<>
			<style>{CSS}</style>
			<div className={`sd${mounted ? ' sd--in' : ''}`}>
				{/* Header */}
				<header className='sd-header'>
					<button
						className='sd-back'
						onClick={() => {
							haptic.light()
							router.back()
						}}
					>
						← Orqaga
					</button>
					<span className='sd-header-title'>O'quvchi profili</span>
					<div style={{ width: 80 }} />
				</header>

				<div className='sd-scroll'>
					{/* ── Hero ── */}
					<div className='sd-hero'>
						<div
							className='sd-hero-blur'
							style={{ background: avatarGrad(student.id) }}
						/>
						<div className='sd-hero-body'>
							<div
								className='sd-avatar'
								style={{ background: avatarGrad(student.id) }}
							>
								{ini}
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
										color: STATUS_VAR[student.status],
										background: `color-mix(in srgb,${STATUS_VAR[student.status]} 14%,transparent)`,
										border: `1px solid color-mix(in srgb,${STATUS_VAR[student.status]} 30%,transparent)`,
									}}
								>
									● {STATUS_LABEL[student.status]}
								</span>
								<span
									className='sd-badge'
									style={{
										color: PAY_VAR[student.payment_status],
										background: `color-mix(in srgb,${PAY_VAR[student.payment_status]} 14%,transparent)`,
										border: `1px solid color-mix(in srgb,${PAY_VAR[student.payment_status]} 30%,transparent)`,
									}}
								>
									💳 {PAY_LABEL[student.payment_status]}
								</span>
							</div>
						</div>
					</div>

					{/* ── Attendance ring ── */}
					<div className='sd-att-card'>
						<div className='sd-att-ring-wrap'>
							<svg viewBox='0 0 80 80' className='sd-ring'>
								<circle
									cx='40'
									cy='40'
									r='34'
									fill='none'
									stroke='var(--tg-secondary)'
									strokeWidth='8'
								/>
								<circle
									cx='40'
									cy='40'
									r='34'
									fill='none'
									stroke={pctVar}
									strokeWidth='8'
									strokeDasharray={`${pct * 2.136} ${213.6 - pct * 2.136}`}
									strokeDashoffset='53.4'
									strokeLinecap='round'
									style={{
										transition: 'stroke-dasharray .7s cubic-bezier(.4,0,.2,1)',
									}}
								/>
							</svg>
							<div className='sd-ring-center'>
								<span className='sd-ring-pct' style={{ color: pctVar }}>
									{pct}%
								</span>
								<span className='sd-ring-label'>Davomat</span>
							</div>
						</div>
						<div className='sd-att-stats'>
							{[
								{
									label: 'Keldi',
									val: attStats.present,
									color: 'var(--tg-success)',
								},
								{
									label: 'Kelmadi',
									val: attStats.absent,
									color: 'var(--tg-destructive)',
								},
								{
									label: 'Kech',
									val: attStats.late,
									color: 'var(--tg-warning)',
								},
								{ label: 'Jami', val: attStats.total, color: 'var(--tg-text)' },
							].map(item => (
								<div key={item.label} className='sd-att-stat'>
									<span className='sd-att-num' style={{ color: item.color }}>
										{item.val}
									</span>
									<span className='sd-att-lbl'>{item.label}</span>
								</div>
							))}
						</div>
					</div>

					{/* ── Tabs ── */}
					<div className='sd-tabs'>
						{TABS.map(t => (
							<button
								key={t.key}
								className={`sd-tab${tab === t.key ? ' sd-tab--on' : ''}`}
								onClick={() => {
									haptic.light()
									setTab(t.key)
								}}
							>
								{t.label}
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
								value={fmtDate(student.enrollment_date)}
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
									<p className='sd-empty-t'>Davomat yo'q</p>
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
														: '1px solid var(--tg-sep)',
											}}
										>
											<div>
												<p style={{ fontSize: 14, fontWeight: 600 }}>
													{fmtDate(r.date)}
												</p>
												{r.note && (
													<p
														style={{
															fontSize: 12,
															color: 'var(--tg-hint)',
															marginTop: 2,
														}}
													>
														{r.note}
													</p>
												)}
											</div>
											<span
												className='sd-badge'
												style={{
													color: ATT_VAR[r.status],
													background: `color-mix(in srgb,${ATT_VAR[r.status]} 12%,transparent)`,
													border: `1px solid color-mix(in srgb,${ATT_VAR[r.status]} 25%,transparent)`,
												}}
											>
												{ATT_LABEL[r.status]}
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
								className='sd-pay-hero'
								style={{
									borderColor: `color-mix(in srgb,${PAY_VAR[student.payment_status]} 35%,transparent)`,
								}}
							>
								<p
									style={{
										fontSize: 12,
										color: 'var(--tg-hint)',
										marginBottom: 4,
									}}
								>
									To'lov holati
								</p>
								<p
									style={{
										fontSize: 28,
										fontWeight: 900,
										color: PAY_VAR[student.payment_status],
									}}
								>
									{PAY_LABEL[student.payment_status]}
								</p>
								{(student.debt_amount ?? 0) > 0 && (
									<p
										style={{
											fontSize: 14,
											color: 'var(--tg-destructive)',
											marginTop: 8,
											fontWeight: 700,
										}}
									>
										⚠️ Qarz: {fmtNum(student.debt_amount!)} so'm
									</p>
								)}
							</div>
							<div className='sd-section'>
								<InfoRow
									icon='💵'
									label="Oylik to'lov"
									value={
										student.monthly_fee
											? `${fmtNum(student.monthly_fee)} so'm`
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
										value={fmtDate(student.last_payment_date)}
									/>
								)}
							</div>
						</div>
					)}

					{/* ── Tab: Edit ── */}
					{tab === 'edit' && (
						<div className='sd-edit sd-anim'>
							<p className='sd-edit-sec'>Shaxsiy ma'lumotlar</p>
							<div className='sd-row2'>
								<FField
									label='Ism'
									value={editData.first_name || ''}
									onChange={v => setEditData({ ...editData, first_name: v })}
								/>
								<FField
									label='Familiya'
									value={editData.last_name || ''}
									onChange={v => setEditData({ ...editData, last_name: v })}
								/>
							</div>
							<FField
								label='Telefon'
								value={editData.phone || ''}
								type='tel'
								onChange={v => setEditData({ ...editData, phone: v })}
							/>

							<p className='sd-edit-sec'>Guruh</p>
							<div className='sd-field'>
								<label className='sd-label'>Guruh</label>
								<select
									className='sd-inp'
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

							<p className='sd-edit-sec'>Ota-ona</p>
							<div className='sd-row2'>
								<FField
									label='Ota-ona ismi'
									value={editData.parent_name || ''}
									onChange={v => setEditData({ ...editData, parent_name: v })}
								/>
								<FField
									label='Ota-ona tel'
									value={editData.parent_phone || ''}
									type='tel'
									onChange={v => setEditData({ ...editData, parent_phone: v })}
								/>
							</div>
							<FField
								label='Favqulodda aloqa'
								value={editData.emergency_contact || ''}
								type='tel'
								onChange={v =>
									setEditData({ ...editData, emergency_contact: v })
								}
							/>
							<FField
								label='Manzil'
								value={editData.address || ''}
								onChange={v => setEditData({ ...editData, address: v })}
							/>
							<FField
								label='Izoh'
								value={editData.notes || ''}
								onChange={v => setEditData({ ...editData, notes: v })}
							/>

							<p className='sd-edit-sec'>To'lov</p>
							<div className='sd-row2'>
								<FField
									label="Oylik to'lov"
									type='number'
									value={
										editData.monthly_fee != null
											? String(editData.monthly_fee)
											: ''
									}
									onChange={v =>
										setEditData({
											...editData,
											monthly_fee: v ? Number(v) : undefined,
										})
									}
								/>
								<FField
									label='Chegirma %'
									type='number'
									value={
										editData.discount_percent != null
											? String(editData.discount_percent)
											: ''
									}
									onChange={v =>
										setEditData({ ...editData, discount_percent: Number(v) })
									}
								/>
							</div>
							<FField
								label='Qarz miqdori'
								type='number'
								value={
									editData.debt_amount != null
										? String(editData.debt_amount)
										: ''
								}
								onChange={v =>
									setEditData({
										...editData,
										debt_amount: v ? Number(v) : undefined,
									})
								}
							/>
							<div className='sd-field'>
								<label className='sd-label'>To'lov holati</label>
								<select
									className='sd-inp'
									value={editData.payment_status || 'unpaid'}
									onChange={e =>
										setEditData({
											...editData,
											payment_status: e.target.value as PaymentStatus,
										})
									}
								>
									{(Object.keys(PAY_LABEL) as PaymentStatus[]).map(p => (
										<option key={p} value={p}>
											{PAY_LABEL[p]}
										</option>
									))}
								</select>
							</div>

							<p className='sd-edit-sec'>Status</p>
							<div className='sd-field'>
								<label className='sd-label'>O'quvchi holati</label>
								<select
									className='sd-inp'
									value={editData.status || 'active'}
									onChange={e =>
										setEditData({
											...editData,
											status: e.target.value as StudentStatus,
										})
									}
								>
									{(Object.keys(STATUS_LABEL) as StudentStatus[]).map(s => (
										<option key={s} value={s}>
											{STATUS_LABEL[s]}
										</option>
									))}
								</select>
							</div>

							<button
								className='sd-save'
								onClick={handleSave}
								disabled={saving}
							>
								{saving ? '⏳ Saqlanmoqda...' : '✓ Saqlash'}
							</button>
						</div>
					)}

					{/* ── Danger ── */}
					<div className='sd-danger'>
						<p className='sd-danger-title'>⚠️ Xavfli zona</p>
						<p className='sd-danger-sub'>
							O'quvchini o'chirgandan so'ng tiklab bo'lmaydi.
						</p>
						<button className='sd-del' onClick={handleDelete}>
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
				<p style={{ fontSize: 11, color: 'var(--tg-hint)', marginBottom: 2 }}>
					{label}
				</p>
				<p style={{ fontSize: 15, fontWeight: 600, wordBreak: 'break-word' }}>
					{value}
				</p>
			</div>
		</div>
	)
}
function FField({
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
		<div className='sd-field'>
			<label className='sd-label'>{label}</label>
			<input
				className='sd-inp'
				type={type}
				value={value}
				onChange={e => onChange(e.target.value)}
			/>
		</div>
	)
}

// ─── styles ───────────────────────────────────────────────────────────────────
const BASE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
:root{
  --tg-bg:var(--tg-theme-bg-color,#fff);
  --tg-secondary:var(--tg-theme-secondary-bg-color,#f2f2f7);
  --tg-text:var(--tg-theme-text-color,#000);
  --tg-hint:var(--tg-theme-hint-color,#8e8e93);
  --tg-link:var(--tg-theme-link-color,#007aff);
  --tg-button:var(--tg-theme-button-color,#007aff);
  --tg-btn-text:var(--tg-theme-button-text-color,#fff);
  --tg-destructive:var(--tg-theme-destructive-text-color,#ff3b30);
  --tg-section:var(--tg-theme-section-bg-color,#fff);
  --tg-sep:var(--tg-theme-section_separator_color,rgba(0,0,0,.08));
  --tg-subtitle:var(--tg-theme-subtitle-text-color,#6d6d72);
  --tg-success:#30d158;--tg-warning:#ff9500;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
.sd{font-family:'Nunito',-apple-system,sans-serif;background:var(--tg-bg);color:var(--tg-text);min-height:100vh;}
.sd-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--tg-section);border-bottom:1px solid var(--tg-sep);position:sticky;top:0;z-index:40;backdrop-filter:blur(14px);}
.sd-back{padding:8px 14px;background:var(--tg-secondary);color:var(--tg-text);border:none;border-radius:20px;font-family:'Nunito',sans-serif;font-size:14px;font-weight:700;cursor:pointer;transition:all .15s;}
.sd-back:active{transform:scale(.95);}
.sd-header-title{font-size:17px;font-weight:800;position:absolute;left:50%;transform:translateX(-50%);}
.sd-skel{border-radius:16px;background:linear-gradient(90deg,color-mix(in srgb,var(--tg-hint) 7%,transparent) 0%,color-mix(in srgb,var(--tg-hint) 13%,transparent) 50%,color-mix(in srgb,var(--tg-hint) 7%,transparent) 100%);background-size:200% 100%;animation:shim 1.4s infinite;}
@keyframes shim{to{background-position:-200% 0;}}
.sd-error{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 24px;text-align:center;}
.sd-error-t{font-size:20px;font-weight:800;margin-top:12px;}
.sd-error-s{font-size:14px;color:var(--tg-hint);margin-top:6px;}
`

const CSS =
	BASE_CSS +
	`
/* page animation */
.sd{opacity:0;transform:translateY(10px);transition:opacity .35s ease,transform .35s ease;}
.sd--in{opacity:1;transform:translateY(0);}

.sd-scroll{overflow-y:auto;}

/* hero */
.sd-hero{position:relative;overflow:hidden;padding:28px 20px 24px;text-align:center;}
.sd-hero-blur{position:absolute;inset:0;opacity:.15;filter:blur(36px);transform:scale(1.3);}
.sd-hero-body{position:relative;z-index:1;}
.sd-avatar{width:80px;height:80px;border-radius:24px;display:inline-flex;align-items:center;justify-content:center;font-size:30px;font-weight:900;color:#fff;margin-bottom:12px;box-shadow:0 6px 24px rgba(0,0,0,.2);border:3px solid rgba(255,255,255,.25);}
.sd-hero-name{font-size:24px;font-weight:900;letter-spacing:-.4px;}
.sd-hero-id{font-size:12px;color:var(--tg-hint);margin-top:3px;}
.sd-hero-badges{display:flex;gap:8px;justify-content:center;margin-top:10px;flex-wrap:wrap;}
.sd-badge{display:inline-flex;align-items:center;gap:3px;padding:4px 11px;border-radius:20px;font-size:11px;font-weight:700;}

/* attendance ring card */
.sd-att-card{margin:0 16px 14px;padding:18px;background:var(--tg-section);border:1.5px solid var(--tg-sep);border-radius:20px;display:flex;align-items:center;gap:16px;}
.sd-att-ring-wrap{position:relative;width:80px;height:80px;flex-shrink:0;}
.sd-ring{width:80px;height:80px;transform:rotate(-90deg);}
.sd-ring-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.sd-ring-pct{font-size:18px;font-weight:900;line-height:1;}
.sd-ring-label{font-size:9px;color:var(--tg-hint);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-top:1px;}
.sd-att-stats{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.sd-att-stat{text-align:center;}
.sd-att-num{display:block;font-size:20px;font-weight:900;line-height:1;}
.sd-att-lbl{font-size:11px;color:var(--tg-hint);margin-top:2px;}

/* tabs */
.sd-tabs{display:flex;gap:6px;padding:0 16px 12px;overflow-x:auto;scrollbar-width:none;}
.sd-tabs::-webkit-scrollbar{display:none;}
.sd-tab{padding:8px 15px;border-radius:20px;border:1.5px solid var(--tg-sep);background:var(--tg-secondary);color:var(--tg-subtitle);font-family:'Nunito',sans-serif;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;transition:all .18s;flex-shrink:0;}
.sd-tab--on{background:var(--tg-button);color:var(--tg-btn-text);border-color:transparent;box-shadow:0 3px 12px color-mix(in srgb,var(--tg-button) 40%,transparent);}

/* section */
.sd-section{margin:0 16px 14px;background:var(--tg-section);border:1.5px solid var(--tg-sep);border-radius:18px;overflow:hidden;}
.sd-anim{animation:fadeUp .28s cubic-bezier(.16,1,.3,1);}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}

/* info rows */
.sd-info-row{display:flex;gap:12px;align-items:flex-start;padding:13px 16px;border-bottom:1px solid var(--tg-sep);}
.sd-info-row:last-child{border-bottom:none;}

/* attendance rows */
.sd-att-row{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;}

/* payment hero */
.sd-pay-hero{margin:0 16px 12px;padding:20px;background:var(--tg-section);border:1.5px solid;border-radius:18px;text-align:center;}

/* edit form */
.sd-edit{padding:0 16px 16px;display:flex;flex-direction:column;gap:10px;}
.sd-edit-sec{font-size:11px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--tg-hint);}
.sd-field{display:flex;flex-direction:column;}
.sd-label{font-size:12px;font-weight:700;color:var(--tg-subtitle);margin-bottom:4px;}
.sd-inp{width:100%;padding:10px 13px;background:var(--tg-secondary);border:1.5px solid transparent;border-radius:12px;font-family:'Nunito',sans-serif;font-size:14px;color:var(--tg-text);outline:none;transition:border-color .2s;}
.sd-inp:focus{border-color:color-mix(in srgb,var(--tg-button) 55%,transparent);}
.sd-row2{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.sd-save{width:100%;padding:13px;background:var(--tg-button);color:var(--tg-btn-text);border:none;border-radius:14px;font-family:'Nunito',sans-serif;font-size:15px;font-weight:800;cursor:pointer;margin-top:6px;transition:all .18s;box-shadow:0 4px 14px color-mix(in srgb,var(--tg-button) 38%,transparent);}
.sd-save:disabled{opacity:.55;cursor:not-allowed;}
.sd-save:not(:disabled):active{transform:scale(.98);}

/* danger */
.sd-danger{margin:0 16px 32px;padding:18px;background:color-mix(in srgb,var(--tg-destructive) 6%,var(--tg-section));border:1.5px solid color-mix(in srgb,var(--tg-destructive) 20%,transparent);border-radius:18px;}
.sd-danger-title{font-size:15px;font-weight:800;color:var(--tg-destructive);margin-bottom:5px;}
.sd-danger-sub{font-size:13px;color:var(--tg-subtitle);margin-bottom:13px;}
.sd-del{width:100%;padding:12px;background:var(--tg-destructive);color:#fff;border:none;border-radius:12px;font-family:'Nunito',sans-serif;font-size:14px;font-weight:800;cursor:pointer;transition:all .15s;}
.sd-del:active{transform:scale(.97);}

/* empty */
.sd-empty{text-align:center;padding:48px 24px;color:var(--tg-hint);}
.sd-empty-t{font-size:17px;font-weight:800;color:var(--tg-text);margin-top:10px;}
`

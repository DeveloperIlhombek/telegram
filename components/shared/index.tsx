'use client'

import { haptic } from '@/lib/telegram'
import { usePathname, useRouter } from 'next/navigation'

// ============================================
// Bottom Navigation
// ============================================
interface NavItem {
	path: string
	label: string
	icon: string
	activeIcon: string
}

interface BottomNavProps {
	items: NavItem[]
}

export function BottomNav({ items }: BottomNavProps) {
	const pathname = usePathname()
	const router = useRouter()

	const navigate = (path: string) => {
		if (pathname !== path) {
			haptic.select()
			router.push(path)
		}
	}

	return (
		<nav className='bottom-nav' style={{ flexShrink: 0 }}>
			{items.map(item => {
				const isActive =
					pathname === item.path || pathname.startsWith(item.path + '/')
				return (
					<button
						key={item.path}
						className={`bottom-nav-item ${isActive ? 'active' : ''}`}
						onClick={() => navigate(item.path)}
						style={{ background: 'none', border: 'none' }}
					>
						<span style={{ fontSize: '22px', lineHeight: 1 }}>
							{isActive ? item.activeIcon : item.icon}
						</span>
						<span>{item.label}</span>
					</button>
				)
			})}
		</nav>
	)
}

// ============================================
// Page Header
// ============================================
interface PageHeaderProps {
	title: string
	subtitle?: string
	rightAction?: React.ReactNode
	leftAction?: React.ReactNode
	style?: React.CSSProperties
}

export function PageHeader({
	title,
	subtitle,
	rightAction,
	leftAction,
	style,
}: PageHeaderProps) {
	return (
		<header
			style={{
				padding: '16px 16px 12px',
				backgroundColor: 'var(--tg-bg)',
				borderBottom:
					'0.5px solid color-mix(in srgb, var(--tg-hint) 20%, transparent)',
				flexShrink: 0,
				...style,
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: '12px',
				}}
			>
				<div>
					<h1
						style={{
							fontSize: '20px',
							fontWeight: 700,
							color: 'var(--tg-text)',
							margin: 0,
							lineHeight: 1.2,
						}}
					>
						{title}
					</h1>
					{subtitle && (
						<p
							style={{
								fontSize: '13px',
								color: 'var(--tg-subtitle)',
								margin: '2px 0 0',
							}}
						>
							{subtitle}
						</p>
					)}
				</div>
				{leftAction && <span>{leftAction}</span>}
				{rightAction && <div>{rightAction}</div>}
			</div>
		</header>
	)
}

// ============================================
// Loading Screen
// ============================================
export function LoadingScreen({
	message = 'Yuklanmoqda...',
}: {
	message?: string
}) {
	return (
		<div
			style={{
				flex: 1,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: '16px',
				backgroundColor: 'var(--tg-bg)',
			}}
		>
			<div
				style={{
					width: 36,
					height: 36,
					borderRadius: '50%',
					border:
						'3px solid color-mix(in srgb, var(--tg-button) 25%, transparent)',
					borderTopColor: 'var(--tg-button)',
					animation: 'spin 0.8s linear infinite',
				}}
			/>
			<p style={{ fontSize: '15px', color: 'var(--tg-hint)', margin: 0 }}>
				{message}
			</p>
		</div>
	)
}

// ============================================
// Empty State
// ============================================
interface EmptyStateProps {
	icon?: string
	title: string
	description?: string
	action?: React.ReactNode
}

export function EmptyState({
	icon = '📭',
	title,
	description,
	action,
}: EmptyStateProps) {
	return (
		<div
			style={{
				flex: 1,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				padding: '40px 24px',
				gap: '12px',
				textAlign: 'center',
			}}
		>
			<span style={{ fontSize: '48px', lineHeight: 1 }}>{icon}</span>
			<p
				style={{
					fontSize: '17px',
					fontWeight: 600,
					color: 'var(--tg-text)',
					margin: 0,
				}}
			>
				{title}
			</p>
			{description && (
				<p style={{ fontSize: '14px', color: 'var(--tg-subtitle)', margin: 0 }}>
					{description}
				</p>
			)}
			{action && <div style={{ marginTop: '8px' }}>{action}</div>}
		</div>
	)
}

// ============================================
// Section Container
// ============================================
export function Section({
	title,
	children,
	style,
}: {
	title?: string
	children: React.ReactNode
	style?: React.CSSProperties
}) {
	return (
		<div style={style}>
			{title && (
				<p className='tg-section-header' style={{ marginBottom: '4px' }}>
					{title}
				</p>
			)}
			<div className='tg-section'>{children}</div>
		</div>
	)
}

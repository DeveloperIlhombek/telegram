'use client'

import { EmptyState, LoadingScreen, PageHeader } from '@/components/shared'
import { useTelegram } from '@/hooks/useTelegram'
import { teacherApi } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import { haptic } from '@/lib/telegram'
import { Group } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function TeacherPage() {
	const router = useRouter()
	const { user: tgUser } = useTelegram()
	const [storedUser, setStoredUser] =
		useState<ReturnType<typeof getStoredUser>>(null)
	const [groups, setGroups] = useState<Group[]>([])
	const [isLoading, setIsLoading] = useState(true)

	const today = new Date()
	const todayStr = today.toLocaleDateString('uz-UZ', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
	})

	useEffect(() => {
		setStoredUser(getStoredUser())
		teacherApi
			.getMyGroups()
			.then(setGroups)
			.catch(console.error)
			.finally(() => setIsLoading(false))
	}, [])

	const handleGroupPress = (group: Group) => {
		haptic.medium()
		router.push(`/teacher/attendance/${group.id}`)
	}

	if (isLoading) return <LoadingScreen message='Guruhlar yuklanmoqda...' />

	const displayName =
		storedUser?.first_name || tgUser?.first_name || "O'qituvchi"

	return (
		<div
			className='page-enter'
			style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}
		>
			{/* Header */}
			<PageHeader
				title={`Salom, ${displayName}! 👋`}
				subtitle={todayStr}
				style={{ backgroundColor: 'var(--tg-bg)' }}
			/>

			{/* Content */}
			<div
				style={{
					flex: 1,
					padding: '16px',
					display: 'flex',
					flexDirection: 'column',
					gap: '16px',
				}}
			>
				{groups.length === 0 ? (
					<EmptyState
						icon='📚'
						title='Guruhlar topilmadi'
						description='Sizga hali guruh biriktirilmagan'
					/>
				) : (
					<>
						<p
							style={{
								fontSize: '13px',
								color: 'var(--tg-section-header)',
								textTransform: 'uppercase',
								letterSpacing: '0.5px',
								margin: 0,
								fontWeight: 500,
							}}
						>
							Bugungi darslar — {groups.length} ta guruh
						</p>

						<div className='tg-section'>
							{groups.map((group, index) => (
								<GroupItem
									key={group.id}
									group={group}
									isLast={index === groups.length - 1}
									onClick={() => handleGroupPress(group)}
								/>
							))}
						</div>
					</>
				)}
			</div>
		</div>
	)
}

function GroupItem({
	group,
	isLast,
	onClick,
}: {
	group: Group
	isLast: boolean
	onClick: () => void
}) {
	const colors = [
		'#5e81f4',
		'#f4a25e',
		'#5ef4a2',
		'#f45e5e',
		'#5ec9f4',
		'#c75ef4',
	]
	const color = colors[group.id % colors.length]

	return (
		<button
			className='tg-list-item'
			onClick={onClick}
			style={{
				background: 'none',
				border: 'none',
				width: '100%',
				cursor: 'pointer',
				borderBottom: isLast ? 'none' : '0.5px solid var(--tg-secondary-bg)',
			}}
		>
			{/* Color dot */}
			<div
				style={{
					width: 44,
					height: 44,
					borderRadius: '14px',
					backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0,
					fontSize: '20px',
				}}
			>
				📚
			</div>

			{/* Info */}
			<div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
				<p
					style={{
						fontSize: '16px',
						fontWeight: 600,
						color: 'var(--tg-text)',
						margin: 0,
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
					}}
				>
					{group.name}
				</p>
				<p
					style={{
						fontSize: '13px',
						color: 'var(--tg-subtitle)',
						margin: '2px 0 0',
					}}
				>
					{group.course_name && `${group.description} • `}
					{group.student_count ?? '?'} o'quvchi
					{group.schedule_days && ` • ${group.schedule_days}`}
				</p>
			</div>

			{/* Arrow */}
			<span style={{ color: 'var(--tg-hint)', fontSize: '18px' }}>›</span>
		</button>
	)
}

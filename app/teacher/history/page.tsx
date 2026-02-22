'use client'

import { StatusBadge } from '@/components/attendance'
import { EmptyState, LoadingScreen, PageHeader } from '@/components/shared'
import { teacherApi } from '@/lib/api'
import { formatDate, getFullName } from '@/lib/telegram'
import { AttendanceRecord, Group } from '@/lib/types'
import { useEffect, useState } from 'react'

export default function HistoryPage() {
	const [records, setRecords] = useState<AttendanceRecord[]>([])
	const [groups, setGroups] = useState<Group[]>([])
	const [selectedGroup, setSelectedGroup] = useState<number | undefined>()
	const [isLoading, setIsLoading] = useState(true)
	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)

	useEffect(() => {
		teacherApi.getMyGroups().then(setGroups).catch(console.error)
	}, [])

	useEffect(() => {
		setIsLoading(true)
		setPage(1)
		teacherApi
			.getAttendanceHistory(selectedGroup, 1)
			.then(res => {
				setRecords(res.items)
				setHasMore(res.items.length < res.total)
			})
			.catch(console.error)
			.finally(() => setIsLoading(false))
	}, [selectedGroup])

	const loadMore = async () => {
		const nextPage = page + 1
		const res = await teacherApi.getAttendanceHistory(selectedGroup, nextPage)
		setRecords(prev => {
			const updated = [...prev, ...res.items]
			setHasMore(updated.length < res.total)
			return updated
		})
		setPage(nextPage)
	}

	if (isLoading) return <LoadingScreen message='Tarix yuklanmoqda...' />

	// Group records by date
	const groupedByDate = records.reduce<Record<string, AttendanceRecord[]>>(
		(acc, record) => {
			const date = record.date.split('T')[0]
			if (!acc[date]) acc[date] = []
			acc[date].push(record)
			return acc
		},
		{},
	)

	return (
		<div
			className='page-enter'
			style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}
		>
			<PageHeader title='Davomat Tarixi' />

			{/* Group filter */}
			<div
				style={{
					padding: '12px 16px',
					backgroundColor: 'var(--tg-bg)',
					borderBottom:
						'0.5px solid color-mix(in srgb, var(--tg-hint) 20%, transparent)',
					flexShrink: 0,
				}}
			>
				<div
					style={{
						display: 'flex',
						gap: '8px',
						overflowX: 'auto',
						paddingBottom: '4px',
					}}
				>
					<FilterChip
						label='Barcha guruhlar'
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

			{/* Records */}
			<div
				style={{
					flex: 1,
					padding: '16px',
					display: 'flex',
					flexDirection: 'column',
					gap: '16px',
				}}
			>
				{Object.keys(groupedByDate).length === 0 ? (
					<EmptyState
						icon='📅'
						title='Tarix topilmadi'
						description='Hali davomat qayd etilmagan'
					/>
				) : (
					Object.entries(groupedByDate)
						.sort(([a], [b]) => b.localeCompare(a))
						.map(([date, dayRecords]) => (
							<div key={date}>
								<p
									style={{
										fontSize: '13px',
										color: 'var(--tg-section-header)',
										textTransform: 'uppercase',
										letterSpacing: '0.5px',
										margin: '0 0 6px 4px',
										fontWeight: 500,
									}}
								>
									{formatDate(date)}
								</p>
								<div className='tg-section'>
									{dayRecords.map((record, index) => (
										<div
											key={record.id}
											className='tg-list-item'
											style={{
												borderBottom:
													index === dayRecords.length - 1
														? 'none'
														: '0.5px solid var(--tg-secondary-bg)',
												cursor: 'default',
											}}
										>
											<div style={{ flex: 1, minWidth: 0 }}>
												<p
													style={{
														fontSize: '15px',
														fontWeight: 600,
														color: 'var(--tg-text)',
														margin: 0,
													}}
												>
													{getFullName(record.student?.user)}
												</p>
												{record.student?.group && (
													<p
														style={{
															fontSize: '13px',
															color: 'var(--tg-subtitle)',
															margin: '2px 0 0',
														}}
													>
														{record.student.group.name}
													</p>
												)}
											</div>
											<StatusBadge status={record.status} />
										</div>
									))}
								</div>
							</div>
						))
				)}

				{hasMore && (
					<button className='tg-btn tg-btn-secondary' onClick={loadMore}>
						Ko'proq ko'rish
					</button>
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

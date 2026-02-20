import Link from 'next/link'
// import { redirect } from 'next/navigation'

export default function RootPage() {
	// redirect('/login')
	return (
		<div>
			<Link href={'/login'}>Login sahifasi</Link>
			<Link href={'/register'}>Register sahifasi</Link>
		</div>
	)
}

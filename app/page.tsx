import Link from 'next/link'
// import { redirect } from 'next/navigation'

export default function RootPage() {
	// Frontend ochib, Console ga yozing:
	console.log(process.env.NEXT_PUBLIC_API_URL)
	// redirect('/login')
	return (
		<div className='min-h-screen flex items-center justify-center gap-4'>
			<Link
				href={'/login'}
				className='w-44 h-24 bg-teal-400 text-2xl text-gray-300 border cursor-pointer'
			>
				Login sahifasi
			</Link>
			<Link
				href={'/register'}
				className='w-44 h-24 bg-teal-400 text-2xl text-gray-300 border cursor-pointer'
			>
				Register sahifasi
			</Link>
		</div>
	)
}

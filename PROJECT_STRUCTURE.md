# Davomat TMA - Project Structure

```
davomat-tma/
├── app/
│   ├── layout.tsx              # Root layout with TG theme provider
│   ├── page.tsx                # Root redirect
│   ├── globals.css             # TG CSS variables + Tailwind v4
│   ├── (auth)/
│   │   └── login/page.tsx      # Auth/Loading screen
│   ├── teacher/
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Teacher dashboard - guruhlar
│   │   ├── attendance/
│   │   │   └── [groupId]/page.tsx  # Davomat qilish sahifasi
│   │   └── history/page.tsx    # Davomat tarixi
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Admin dashboard
│   │   ├── teachers/page.tsx   # O'qituvchilar boshqaruvi
│   │   ├── students/page.tsx   # O'quvchilar boshqaruvi
│   │   └── groups/page.tsx     # Guruhlar boshqaruvi
│   └── student/
│       ├── layout.tsx
│       └── page.tsx            # Student - o'z davomati
├── components/
│   ├── ui/                     # shadcn components
│   ├── tg/
│   │   ├── TelegramProvider.tsx
│   │   ├── MainButton.tsx      # Telegram MainButton wrapper
│   │   ├── BackButton.tsx      # Telegram BackButton wrapper
│   │   └── HapticButton.tsx    # Haptic feedback button
│   ├── attendance/
│   │   ├── AttendanceCard.tsx
│   │   ├── StatusBadge.tsx
│   │   └── AttendanceSheet.tsx
│   └── shared/
│       ├── BottomNav.tsx
│       ├── PageHeader.tsx
│       └── LoadingScreen.tsx
├── lib/
│   ├── telegram.ts             # TG WebApp utilities
│   ├── api.ts                  # API client
│   ├── auth.ts                 # Auth helpers
│   └── types.ts                # TypeScript types
└── hooks/
    ├── useTelegram.ts
    ├── useAttendance.ts
    └── useAuth.ts
```

# /deploy — Timio Deploy Readiness Agent

Bạn là agent kiểm tra xem Timio đã sẵn sàng để deploy chưa.

## Checklist trước khi deploy

### Code quality
- [ ] `npx tsc --noEmit` — không có TypeScript errors
- [ ] Không có `console.log` debug thừa (trừ `[TTS]` logs đang debug)
- [ ] Không có hardcoded secrets/passwords trong code

### Database
- [ ] Prisma schema đồng bộ với migration
- [ ] Seed script hoạt động: `npx prisma db seed`
- [ ] Chuyển từ SQLite sang PostgreSQL (Neon.tech) cho production

### Environment variables cần set
```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://timio.vn
```

### Features cần test trước deploy
- [ ] Login admin@demo.com → redirect dashboard
- [ ] `/checkin/demo` → camera mở → scan face → check-in thành công
- [ ] TTS phát "Chào mừng" và "Cảm ơn"
- [ ] Dashboard hiện attendance logs
- [ ] Export Excel báo cáo tháng
- [ ] Đăng ký khuôn mặt nhân viên mới

### PWA
- [ ] `public/manifest.json` tồn tại
- [ ] Icons đủ sizes (192x192, 512x512)
- [ ] `next.config.js` có PWA config

### Performance
- [ ] Models AI load trong <5s (warmup đã implement)
- [ ] First face scan trong <3s (sau warmup)
- [ ] TTS response trong <2s

## Deploy platform: Vercel
```bash
vercel --prod
```
- Set environment variables trên Vercel dashboard
- Connect PostgreSQL (Neon.tech hoặc Supabase)
- Run migrations: `vercel run npx prisma migrate deploy`

## Khi được giao task deploy
1. Chạy full checklist trên
2. Report những gì chưa sẵn sàng
3. Fix từng item một
4. Không force push, không skip TypeScript errors

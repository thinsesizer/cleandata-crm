## Deployment Guide

Choose your hosting provider:

### Option 1: Vercel (Recommended)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Link project
vercel link

# 4. Add environment variables
vercel env add .env.example

# 5. Deploy
vercel --prod
```

### Option 2: Railway

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Create project
railway init

# 4. Add PostgreSQL
railway add postgresql

# 5. Deploy
railway up
```

### Option 3: Docker

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --include=dev

COPY . .

RUN npm run build

ENV NODE_ENV production

CMD ["npm", "start"]
```

```bash
docker build -t cleandata-crm .
docker run -p 3000:3000 cleandata-crm
```

---

## Database Setup

### Migrations

```bash
npx prisma generate
npx prisma migrate deploy
```

### Environment Variables

Required:
- `DATABASE_URL`
- `NEXTAUTH_SECRET` (min 32 chars)
- `NEXT_PUBLIC_APP_URL`

---

## Production Scaling

### Architecture

```
                      +--------------------+
                      |      Vercel        |
                      | (Next.js Frontend) |
                      +---------+----------+
                                |
                +---------------+---------------+
                |               |               |
        +-------+-------+ +------+-------+ +--------+-----+
        | Background    | | Background   | | Background   |
        | Workers       | | Workers      | | Workers      |
        | (BullMQ)      | | (BullMQ)     | | (BullMQ)     |
        +-------+-------+ +------+-------+ +--------+-----+
                |               |               |
                +-------+-------+---------------+
                        |
                +-------v-------+
                |    Redis      |
                | (Queue Store) |
                +-------+-------+
                        |
                +-------v-------+
                | PostgreSQL    |
                | (Supabase)    |
                +---------------+
```

---

## Health Checks

Add to ENV:
```bash
# For Kubernetes/ECS healthchecks
HEALTH_CHECK_SECRET=your-random-secret
```

Endpoint:
```
GET /api/health?secret=your-random-secret
```

---

## Security Best Practices

1. **Enable SSL**: Force HTTPS in production
2. **CSP Headers**: Add Content Security Policy
3. **Rate Limiting**: Use Upstash Redis for API routes
4. **Row Level Security**: Ensure Supabase RLS is enabled
5. **Security Headers**: Add Strict-Transport-Security, X-Content-Type-Options

---

## Performance Optimization

1. **ISR**: Use Incremental Static Regeneration
2. **Edge Functions**: For high-latency APIs
3. **Redis Cache**: Query caching
4. **Optimized Images**: Use next/image
5. **Code Splitting**: Dynamic imports for heavy components

---

## Maintenance Scripts

```bash
# Full data reset
npm run db:reset

# Seed sample data
npm run db:seed

# Run database backups
npm run db:backup
```

---

## Support

For help:
```bash
npm run support
```

Check status page:
https://status.cleandata.app
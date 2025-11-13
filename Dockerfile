# 1) 빌드 스테이지
FROM node:20-alpine AS builder

WORKDIR /app

# 패키지 파일 복사
COPY package.json package-lock.json* ./

# 의존성 설치
RUN npm install --force

# 소스코드 복사
COPY . .


# 앱 빌드
RUN npm run build

# Prisma Client 생성
RUN npx prisma generate

# 2) 런타임 스테이지  
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# 보안을 위한 사용자 생성
RUN addgroup --system --gid 1001 nestjs
RUN adduser --system --uid 1001 nestjs

# 프로덕션 의존성만 설치
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --force && npm cache clean --force

# Prisma schema 복사 및 Client 생성
COPY prisma ./prisma
RUN npx prisma generate

# 빌드 결과물 복사
COPY --from=builder --chown=nestjs:nestjs /app/dist ./dist

USER nestjs

EXPOSE 3000

CMD ["node", "dist/main.js"]
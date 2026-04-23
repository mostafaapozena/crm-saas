FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

EXPOSE 5000

CMD ["sh", "-c", "npx prisma db push && node src/lib/seed.js && node src/index.js"]

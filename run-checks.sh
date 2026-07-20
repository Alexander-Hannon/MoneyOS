#!/usr/bin/env bash

set -e

echo "Generating Prisma client..."
npx prisma generate

echo "Pushing database schema..."
npx prisma db push

echo "Running lint..."
npm run lint

echo "Running type check..."
npm run typecheck

echo "Running build..."
npm run build

echo "MoneyOS update complete."

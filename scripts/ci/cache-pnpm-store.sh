#! /bin/sh

mkdir -p /cache/.pnpm-store

echo "Copying cache to pnpm store..."
cp -R /cache/.pnpm-store/ /root/
echo "Copying complete"

pnpm i

echo "Copying pnpm store to cache..."
rm -rf /cache/.pnpm-store/
cp -R /root/.pnpm-store/ /cache/temp-cache
mv /cache/temp-cache/ /cache/.pnpm-store
echo "Copying complete"

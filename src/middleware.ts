import { defineMiddleware } from 'astro:middleware';

const PUBLIC_ADMIN_PATHS = new Set(['/admin/login']);
const PUBLIC_SHOP_PATHS = new Set(['/shop/login', '/shop/signup']);

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  const isAdminPage = pathname.startsWith('/admin');
  const isPublicAdminPath = PUBLIC_ADMIN_PATHS.has(pathname);
  if (isAdminPage && !isPublicAdminPath) {
    const adminId = await context.session?.get('adminId');
    if (!adminId) {
      return context.redirect('/admin/login');
    }
  }

  const isShopPage = pathname.startsWith('/shop');
  const isPublicShopPath = PUBLIC_SHOP_PATHS.has(pathname);
  if (isShopPage && !isPublicShopPath) {
    const userId = await context.session?.get('userId');
    if (!userId) {
      return context.redirect('/shop/login');
    }
  }

  return next();
});
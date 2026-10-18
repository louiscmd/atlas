import "server-only";
import { db } from "../db";

/** In-app notification; respects per-category opt-outs. Push/email delivery plugs in here. */
export async function notify(userId: string, category: string, title: string, body: string, href?: string) {
  const prefs = await db.userPreferences.findUnique({ where: { userId }, select: { notifications: true } });
  const settings = (prefs?.notifications ?? {}) as Record<string, boolean>;
  if (settings[category] === false) return null;
  return db.notification.create({ data: { userId, category, title, body, href: href ?? null } });
}

export async function listNotifications(userId: string) {
  return db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 });
}
export async function unreadCount(userId: string) {
  return db.notification.count({ where: { userId, readAt: null } });
}
export async function markAllRead(userId: string) {
  await db.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}
export async function setNotificationPref(userId: string, category: string, enabled: boolean) {
  const prefs = await db.userPreferences.upsert({ where: { userId }, create: { userId, restByExercise: {}, notifications: {} }, update: {} });
  await db.userPreferences.update({ where: { userId }, data: { notifications: { ...((prefs.notifications ?? {}) as object), [category]: enabled } } });
}

import webpush from "web-push";

const VAPID_EMAIL = process.env.VAPID_EMAIL ?? "mailto:admin@example.com";

webpush.setVapidDetails(
  VAPID_EMAIL,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export { webpush };

export type PushSubscriptionJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

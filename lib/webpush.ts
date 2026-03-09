import webpush from "web-push";

export type PushSubscriptionJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

let initialized = false;

function getWebPush() {
  if (!initialized) {
    const email = process.env.VAPID_EMAIL ?? "mailto:admin@example.com";
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) {
      throw new Error("VAPID keys are not set");
    }
    webpush.setVapidDetails(email, publicKey, privateKey);
    initialized = true;
  }
  return webpush;
}

export { getWebPush };

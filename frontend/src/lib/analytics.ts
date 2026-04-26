import posthog from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

let isInitialized = false;

export const initAnalytics = () => {
  if (isInitialized || !POSTHOG_KEY) return;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    capture_pageview: false,
    autocapture: true,
    loaded: () => {
      isInitialized = true;
    },
  });
};

export const captureAnalyticsEvent = (event: string, properties?: Record<string, unknown>) => {
  if (!POSTHOG_KEY || !isInitialized) return;
  posthog.capture(event, properties);
};

export const identifyAnalyticsUser = (user: {
  id?: string;
  email?: string;
  role?: string;
  firstName?: string;
  lastName?: string;
}) => {
  if (!POSTHOG_KEY || !isInitialized || !user.id) return;

  posthog.identify(user.id, {
    email: user.email,
    role: user.role,
    first_name: user.firstName,
    last_name: user.lastName,
  });
};

export const resetAnalytics = () => {
  if (!POSTHOG_KEY || !isInitialized) return;
  posthog.reset();
};


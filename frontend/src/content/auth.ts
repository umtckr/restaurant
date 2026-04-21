import { brand } from "./home";
import { marketingPaths } from "./marketingPaths";

export { brand };

export const loginCopy = {
  eyebrow: "Welcome back",
  title: "Sign in to your workspace",
  subtitle: "Use the work email your organization invited.",
  alternatePrompt: "New to Dinebird?",
  alternateLink: "Create an account",
  alternateHref: "/register",
  forgot: "Forgot password?",
  forgotHref: "/contact",
  submit: "Sign in",
  remember: "Keep me signed in",
};

export const registerCopy = {
  eyebrow: "Get started",
  title: "Create your account",
  subtitle: "One profile for ordering and history across every venue on the platform.",
  alternatePrompt: "Already registered?",
  alternateLink: "Sign in",
  alternateHref: "/login",
  submit: "Create account",
  legalPrefix: "By continuing you agree to our",
  terms: "Terms",
  termsHref: marketingPaths.terms,
  privacy: "Privacy Policy",
  privacyHref: marketingPaths.privacy,
};

export const panelCopy = {
  title: "Operations that scale with every cover.",
  text: "Manage menus, sessions, floor, kitchen, and payments across your group—without losing the polish guests expect.",
  bullets: [
    "Role-aware dashboards for staff and admins",
    "Session-based QR ordering with waiter control",
    "Tip and service charge policies per location",
  ],
};

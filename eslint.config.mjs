import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Separate build output used for the test environment (dev:test / .env.test) — not covered by ".next/**".
    ".next-test/**",
    // SonarQube local scan cache.
    ".scannerwork/**",
    // Buaflow kit tooling (plain Node/CommonJS scripts) — not application source.
    ".claude/**",
  ]),
  // Baseline (Phase A.2): react-hooks/set-state-in-effect flags this codebase's existing
  // fetch-on-mount convention (useEffect + fetch().then(setState)) used across most pages.
  // Kept as "warn" only for the files where it already existed at adoption time, so verify
  // stays green without hiding the finding; any NEW file hitting this rule still fails.
  // Tracked in docs/intents/ for a future data-fetching pattern migration.
  {
    files: [
      "app/(backoffice)/fleet/geofencing/page.tsx",
      "app/(backoffice)/fleet/vehicles/\\[id\\]/page.tsx",
      "app/(backoffice)/customers/\\[id\\]/page.tsx",
      "app/(backoffice)/customers/blacklist/page.tsx",
      "app/(backoffice)/billing/invoices/page.tsx",
      "app/(backoffice)/billing/invoices/\\[id\\]/page.tsx",
      "app/(backoffice)/billing/overdue/page.tsx",
      "app/(backoffice)/contracts/\\[id\\]/page.tsx",
      "app/(backoffice)/settings/users/page.tsx",
      "app/(backoffice)/settings/permissions/page.tsx",
      "app/(backoffice)/settings/audit-log/page.tsx",
      "components/ui/vehicle-form-modal.tsx",
      "components/ui/registration-link-modal.tsx",
      "components/ui/modal.tsx",
      "components/ui/contract-form.tsx",
      "components/layout/sidebar.tsx",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
]);

export default eslintConfig;

## Security Update: CVE-2025-55182 Mitigation

Date: 2025-12-05

Summary:
- This repository was using React 19.1.0 and Next.js 15.4.5 which were affected by CVE-2025-55182, a critical remote code execution vulnerability related to React Server Components during payload deserialization.

Mitigation Steps Taken:
- Upgraded `react` and `react-dom` to `19.1.2`.
- Upgraded `next` and `eslint-config-next` to `15.4.8`.
- Ran `npm install` and validated the build with `npm run build`.

Recommendations:
- If you're running this application in production, redeploy using the updated Docker image or Node environment after running `npm ci` or `npm install`.
- If your app doesn't use React Server Functions/Components, it is unlikely to be directly affected, but it's still recommended to upgrade to the patched versions.
- Follow vendor advisories: https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components and Next.js update guidance.

Contact:
- If you detect any unusual behavior after the upgrade, open an issue or contact the repository maintainers.

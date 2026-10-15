// An explicit empty value means same-origin /api calls behind CloudFront.
// Local development defaults to the AWS backend; never expose server secrets here.
const configured = process.env.NEXT_PUBLIC_BACKEND_URL;
export const BACKEND = configured === undefined
  ? "http://localhost:8081"
  : configured.trim().replace(/\/+$/, "");

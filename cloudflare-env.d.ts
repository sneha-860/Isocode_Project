declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    GEMINI_API_KEY?: string;
    GEMINI_MODEL?: string;
    EXPORT_JOB_SECRET?: string;
    PRIVATE_EXPORT_AUTOMATION?: string;
    APP_ORIGIN?: string;
  }
}

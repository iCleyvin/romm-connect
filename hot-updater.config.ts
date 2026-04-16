import { expo } from "@hot-updater/expo";
import { s3Storage } from "@hot-updater/aws";
import { postgres } from "@hot-updater/postgres";
import { config } from "dotenv";
import { defineConfig } from "hot-updater";

config({ path: ".env.hotupdater" });

export default defineConfig({
  build: expo(),
  storage: s3Storage({
    bucketName: process.env.HOT_UPDATER_S3_BUCKET!,
    region: "us-east-1",
    endpoint: process.env.HOT_UPDATER_S3_ENDPOINT!,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.HOT_UPDATER_S3_ACCESS_KEY!,
      secretAccessKey: process.env.HOT_UPDATER_S3_SECRET_KEY!,
    },
  }),
  database: postgres({
    databaseUrl: process.env.HOT_UPDATER_DATABASE_URL!,
  }),
  updateStrategy: "appVersion",
});

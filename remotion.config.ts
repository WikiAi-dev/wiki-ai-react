import { Config } from "@remotion/cli/config";

// The WikiAI pitch film lives in video/ next to the Next.js app; assets
// come from the app's public/ folder (staticFile("presentation/wikiai/…")).
Config.setEntryPoint("video/index.ts");
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

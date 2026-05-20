import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// `VITE_API_BASE_URL`은 정적으로 번들에 인라인되므로 누락된 채 prod 빌드가
// 통과하면 사용자에게 도달한 뒤에야 깨진다. 빌드 자체를 실패시켜서
// CI/CF Pages가 잘못된 산출물을 배포하지 못하게 막는다.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (mode === "production" && !env.VITE_API_BASE_URL) {
    throw new Error(
      "VITE_API_BASE_URL must be set at build time for production",
    );
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

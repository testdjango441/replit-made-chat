import { useQuery } from "@tanstack/react-query";

const OPENAPI_URL = "https://b2966c6366f4.ngrok-free.app/openapi.json";

export function useOpenApiSpec() {
  return useQuery({
    queryKey: ["openapi-spec"],
    queryFn: async () => {
      const response = await fetch(OPENAPI_URL);
      if (!response.ok) {
        throw new Error("Failed to fetch OpenAPI spec");
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

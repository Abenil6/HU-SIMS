import { useState, useEffect } from "react";
import { systemService, PublicConfig } from "@/services/systemService";

export function usePublicConfig() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchConfig() {
      try {
        const data = await systemService.getPublicConfig();
        if (!cancelled) {
          setConfig(data);
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      }
    }

    fetchConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  return { config, loading, error };
}

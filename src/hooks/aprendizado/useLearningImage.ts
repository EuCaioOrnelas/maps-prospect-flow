import { useEffect, useState } from "react";
import { resolveLearningImage } from "@/services/aprendizado/learningMedia";

/** Resolve a URL assinada de uma imagem da central, com cache em memoria. */
export function useLearningImage(path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!path) {
      setUrl(null);
      return;
    }
    resolveLearningImage(path)
      .then((signed) => {
        if (active) setUrl(signed);
      })
      .catch(() => {
        if (active) setUrl(null);
      });
    return () => {
      active = false;
    };
  }, [path]);

  return url;
}

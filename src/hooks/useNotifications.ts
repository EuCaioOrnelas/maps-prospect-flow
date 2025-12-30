import { useState, useEffect, useCallback } from "react";

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [isSupported]);

  const sendNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!isSupported || permission !== "granted") return null;

      try {
        const notification = new Notification(title, {
          icon: "/pwa-192x192.png",
          badge: "/pwa-192x192.png",
          ...options,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        return notification;
      } catch (error) {
        console.error("Error sending notification:", error);
        return null;
      }
    },
    [isSupported, permission]
  );

  const notifyCreditsExhausted = useCallback(() => {
    sendNotification("Suas buscas acabaram! 🔍", {
      body: "Faça upgrade e ganhe até 50% de desconto na promoção de lançamento!",
      tag: "credits-exhausted",
      requireInteraction: true,
    });
  }, [sendNotification]);

  const notifyLowCredits = useCallback((remaining: number) => {
    sendNotification(`Restam apenas ${remaining} buscas! ⚠️`, {
      body: "Aproveite até 50% OFF nos planos e continue prospectando.",
      tag: "low-credits",
    });
  }, [sendNotification]);

  return {
    isSupported,
    permission,
    requestPermission,
    sendNotification,
    notifyCreditsExhausted,
    notifyLowCredits,
  };
};

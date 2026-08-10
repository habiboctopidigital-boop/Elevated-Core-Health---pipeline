"use client"

import { createContext, useContext, ReactNode } from "react"
import { useNotifications, type Notification } from "@/hooks/notifications/useNotifications"

interface NotificationsContextType {
  notifications: Notification[]
  addNotification: (message: string, type?: Notification["type"]) => string
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  unreadCount: number
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const notifications = useNotifications()

  return (
    <NotificationsContext.Provider value={notifications}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotificationsContext() {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error("useNotificationsContext must be used within NotificationsProvider")
  }
  return context
}

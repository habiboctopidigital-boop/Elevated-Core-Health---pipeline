"use client"

import { useState, useCallback } from "react"

export interface Notification {
  id: string
  message: string
  type: "flag" | "stale" | "assignment" | "onboarding" | "success" | "info"
  timestamp: Date
  read: boolean
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      message: "3 cards flagged for review",
      type: "flag",
      timestamp: new Date(Date.now() - 5 * 60000),
      read: false,
    },
    {
      id: "2",
      message: "2 stale cards in pipeline",
      type: "stale",
      timestamp: new Date(Date.now() - 15 * 60000),
      read: false,
    },
  ])

  const addNotification = useCallback((
    message: string,
    type: Notification["type"] = "info"
  ) => {
    const newNotification: Notification = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: new Date(),
      read: false,
    }
    setNotifications((prev) => [newNotification, ...prev])
    return newNotification.id
  }, [])

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  return {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    unreadCount,
  }
}

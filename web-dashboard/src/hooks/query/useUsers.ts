"use client"

import { useQuery } from "@tanstack/react-query"
import { UsersService } from "@/services/users.service"
import { QUERY_KEYS } from "@/constants"

/** All users (admin + VAs) - used for activity-log actor filters etc. */
export function useAllUsers() {
  return useQuery({
    queryKey: QUERY_KEYS.USERS.ALL,
    queryFn: () => UsersService.listAll(),
    staleTime: 5 * 60 * 1000,
  })
}

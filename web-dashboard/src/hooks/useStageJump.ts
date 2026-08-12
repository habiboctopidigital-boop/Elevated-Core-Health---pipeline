"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Stage-jump state shared by the VA and admin boards. Tracks the stage being
 * jumped to (drives the flash highlight), owns the refs needed to scroll each
 * column into view, and auto-clears the flash after ~1.2s so no ring/border
 * is left behind.
 */
export function useStageJump() {
  const [activeStage, setActiveStage] = useState<string | null>(null)
  const stageRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const jumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear the jump-flash timer on unmount so a stale timer can't keep state alive
  useEffect(() => {
    return () => {
      if (jumpTimer.current) clearTimeout(jumpTimer.current)
    }
  }, [])

  const jump = (stage: string) => {
    setActiveStage(stage)
    if (jumpTimer.current) clearTimeout(jumpTimer.current)
    jumpTimer.current = setTimeout(() => setActiveStage(null), 1200)
    setTimeout(() => {
      stageRefs.current[stage]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
    }, 0)
  }

  /** Ref callback for a stage column — attach via `ref={registerStageRef(stage)}`. */
  const registerStageRef = (stage: string) => (el: HTMLDivElement | null) => {
    if (el) stageRefs.current[stage] = el
  }

  return { activeStage, jump, registerStageRef }
}

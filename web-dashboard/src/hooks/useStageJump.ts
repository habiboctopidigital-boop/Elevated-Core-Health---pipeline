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
  // Sticky value of the last stage jumped to — drives the phone dropdown so
  // the selected stage stays visible after the flash highlight clears.
  const [lastJumpedStage, setLastJumpedStage] = useState<string | null>(null)
  const stageRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const jumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear the jump-flash timer on unmount so a stale timer can't keep state alive
  useEffect(() => {
    return () => {
      if (jumpTimer.current) clearTimeout(jumpTimer.current)
    }
  }, [])

  const jump = (stage: string) => {
    // activeStage drives the brief flash highlight and auto-clears;
    // lastJumpedStage persists so the select keeps showing the jump target.
    setActiveStage(stage)
    setLastJumpedStage(stage)
    if (jumpTimer.current) clearTimeout(jumpTimer.current)
    jumpTimer.current = setTimeout(() => setActiveStage(null), 1200)
    // block: "start" scrolls the target to the TOP of its scroll container,
    // so in list view the jumped-to stage lands at the top with the rest of
    // the stages below it (grid columns are full-height, so vertically this
    // is a no-op there — inline centering still brings the column into view).
    setTimeout(() => {
      stageRefs.current[stage]?.scrollIntoView({ behavior: "smooth", block: "start", inline: "center" })
    }, 0)
  }

  /** Ref callback for a stage column — attach via `ref={registerStageRef(stage)}`. */
  const registerStageRef = (stage: string) => (el: HTMLDivElement | null) => {
    if (el) stageRefs.current[stage] = el
  }

  return { activeStage, lastJumpedStage, jump, registerStageRef }
}

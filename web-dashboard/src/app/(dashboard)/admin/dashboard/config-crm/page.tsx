"use client"

import { useState } from "react"
import { SettingsNav } from "@/components/features/settings-nav"
import { useCrmIntegration, useConnectCrm, useDisconnectCrm, useUpdateCrmPermission } from "@/hooks/query/useAdmin"
import type { CrmPermission, CrmProvider } from "@/types"
import { Plug, Loader2, CheckCircle2, KeyRound, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

const PROVIDERS: { value: CrmProvider; label: string }[] = [
  { value: "private_crm", label: "Private CRM" },
  { value: "gohighlevel", label: "GoHighLevel" },
]

const PERMISSIONS: { value: CrmPermission; label: string; desc: string }[] = [
  { value: "read", label: "Read", desc: "Pull contacts and status only" },
  { value: "write", label: "Write", desc: "Push updates only" },
  { value: "both", label: "Read & Write", desc: "Full two-way sync" },
]

export default function ConfigCrmPage() {
  const { data: integration, isLoading } = useCrmIntegration()
  const connectCrm = useConnectCrm()
  const disconnectCrm = useDisconnectCrm()
  const updatePermission = useUpdateCrmPermission()

  const [provider, setProvider] = useState<CrmProvider>("private_crm")
  const [apiKey, setApiKey] = useState("")
  const [permission, setPermission] = useState<CrmPermission>("read")

  const isConnected = integration?.status === "connected"

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (apiKey.trim().length < 8) return
    await connectCrm.mutateAsync({ provider, apiKey: apiKey.trim(), permission })
    setApiKey("")
  }

  const handlePermissionChange = (next: CrmPermission) => {
    if (isConnected) updatePermission.mutate(next)
  }

  return (
    <div>
      <SettingsNav currentPage="config-crm" className="-mx-6 -mt-6 mb-6" />

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EBF7EC] flex items-center justify-center">
            <Plug className="w-5 h-5 text-[#036638]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#1A1B1E]">CRM Connect</h1>
            <p className="text-sm text-[#6B7280]">
              Link an external CRM (your private system or GoHighLevel) to sync contacts.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 text-[#036638] animate-spin" />
          </div>
        ) : isConnected ? (
          <div className="bg-white rounded-2xl border border-[#65BD6C]/30 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-[#1A1B1E]">
                    Connected to {integration?.provider === "gohighlevel" ? "GoHighLevel" : "Private CRM"}
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    Key ending in •••• {integration?.apiKeyLast4}
                    {integration?.connectedByUser && ` — by ${integration.connectedByUser.name}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => disconnectCrm.mutate()}
                disabled={disconnectCrm.isPending}
                className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
              >
                {disconnectCrm.isPending ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-100">
              <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Permission
              </p>
              <div className="grid grid-cols-3 gap-2">
                {PERMISSIONS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => handlePermissionChange(p.value)}
                    disabled={updatePermission.isPending}
                    className={cn(
                      "text-left p-3 rounded-xl border text-xs transition-colors disabled:opacity-50",
                      integration?.permission === p.value
                        ? "border-[#036638] bg-[#EBF7EC] text-[#036638]"
                        : "border-[#E5E7EB] text-[#6B7280] hover:border-[#65BD6C]/40",
                    )}
                  >
                    <span className="font-semibold block">{p.label}</span>
                    <span className="text-[10px] opacity-80">{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConnect} className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151] uppercase tracking-wider">CRM Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as CrmProvider)}
                className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30 appearance-none cursor-pointer"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151] uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                API / Requirement Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your API key..."
                className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30"
                autoComplete="off"
              />
              <p className="text-[10px] text-[#9CA3AF]">Only the last 4 characters are stored — never the full key.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#374151] uppercase tracking-wider">Permission</label>
              <div className="grid grid-cols-3 gap-2">
                {PERMISSIONS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPermission(p.value)}
                    className={cn(
                      "text-left p-3 rounded-xl border text-xs transition-colors",
                      permission === p.value
                        ? "border-[#036638] bg-[#EBF7EC] text-[#036638]"
                        : "border-[#E5E7EB] text-[#6B7280] hover:border-[#65BD6C]/40",
                    )}
                  >
                    <span className="font-semibold block">{p.label}</span>
                    <span className="text-[10px] opacity-80">{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={connectCrm.isPending || apiKey.trim().length < 8}
              className="w-full h-10 rounded-lg bg-[#036638] hover:bg-[#025030] text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {connectCrm.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect CRM"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Copy, Check, RefreshCw, Zap, Lock, AlertTriangle, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { SettingsNav } from "@/components/features/settings-nav"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function WebhooksPage() {
  const [webhookSecret, setWebhookSecret] = useState("")
  const [showSecret, setShowSecret] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [webhookLogs, setWebhookLogs] = useState<any[]>([])
  const [testLoading, setTestLoading] = useState(false)
  const [testResponse, setTestResponse] = useState<any>(null)

  const webhookUrl = `${API_BASE_URL}/patients/intake`

  useEffect(() => {
    // Fetch webhook secret from localStorage or env
    const secret = localStorage.getItem("webhook_secret") || "ech_secret_" + Math.random().toString(36).substr(2, 9)
    setWebhookSecret(secret)
    localStorage.setItem("webhook_secret", secret)
  }, [])

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const regenerateSecret = () => {
    setLoading(true)
    const newSecret = "ech_secret_" + Math.random().toString(36).substr(2, 9)
    localStorage.setItem("webhook_secret", newSecret)
    setWebhookSecret(newSecret)
    toast.success("Webhook secret regenerated")
    setLoading(false)
  }

  const testWebhook = async () => {
    setTestLoading(true)
    try {
      const testPayload = {
        name: "Test Patient",
        email: "test@example.com",
        phone: "+1234567890",
        appointmentDatetime: new Date(Date.now() + 3600000).toISOString(),
        vaName: "Jude", // Optional: auto-assign to specific VA
        bookingPlatform: "test",
        source: "webhook_test",
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-secret": webhookSecret,
        },
        body: JSON.stringify(testPayload),
      })

      const data = await response.json()
      setTestResponse({
        status: response.status,
        statusText: response.statusText,
        data,
        timestamp: new Date().toISOString(),
      })

      if (response.ok) {
        toast.success("Webhook test successful!")
      } else {
        toast.error("Webhook test failed: " + (data?.message || response.statusText))
      }
    } catch (error: any) {
      toast.error("Webhook test error: " + error.message)
      setTestResponse({
        error: error.message,
        timestamp: new Date().toISOString(),
      })
    }
    setTestLoading(false)
  }

  return (
    <>
      {/* Settings Navigation - Top */}
      <SettingsNav currentPage="webhooks" />

      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-lg bg-[#036638]/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#036638]" />
            </div>
            <h1 className="text-xl font-bold text-[#1A1B1E]">Webhook Configuration</h1>
          </div>
          <p className="text-sm text-[#6B7280] ml-12">
            Configure automation integrations with Make.com, Zapier, and other services
          </p>
        </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-semibold mb-1">How webhooks work</p>
          <p>
            Webhook integrations allow external services (Make.com, Zapier, etc.) to automatically create patients
            in your pipeline when bookings are received. Use the configuration below to set up your automation.
          </p>
        </div>
      </div>

      {/* Webhook URL Card */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <div className="bg-gradient-to-r from-[#EBF7EC] to-[#F0F9F4] px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="font-semibold text-[#1A1B1E] flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#036638]" />
            Webhook Endpoint URL
          </h2>
          <p className="text-xs text-[#6B7280] mt-1">Use this URL in your automation platform</p>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            <label className="text-xs font-semibold text-[#6B7280] uppercase">Endpoint URL</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-[#F3F4F6] px-4 py-3 rounded-lg font-mono text-sm text-[#1A1B1E] break-all">
                {webhookUrl}
              </code>
              <button
                onClick={() => copyToClipboard(webhookUrl, "Webhook URL")}
                className="p-3 hover:bg-[#F3F4F6] rounded-lg transition-colors"
                title="Copy webhook URL"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-[#6B7280]" />
                )}
              </button>
            </div>
            <p className="text-xs text-[#6B7280]">
              This is the URL you'll provide to Make.com or other automation platforms.
            </p>
          </div>
        </div>
      </div>

      {/* Webhook Secret Card */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <div className="bg-gradient-to-r from-[#EBF7EC] to-[#F0F9F4] px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="font-semibold text-[#1A1B1E] flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#036638]" />
            Webhook Secret
          </h2>
          <p className="text-xs text-[#6B7280] mt-1">Authentication token for webhook requests</p>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            <label className="text-xs font-semibold text-[#6B7280] uppercase">Secret Key</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-[#F3F4F6] px-4 py-3 rounded-lg">
                <code className="font-mono text-sm text-[#1A1B1E] flex-1">
                  {showSecret ? webhookSecret : "•".repeat(webhookSecret.length)}
                </code>
              </div>
              <button
                onClick={() => setShowSecret(!showSecret)}
                className="p-3 hover:bg-[#F3F4F6] rounded-lg transition-colors"
                title="Toggle visibility"
              >
                {showSecret ? (
                  <EyeOff className="w-4 h-4 text-[#6B7280]" />
                ) : (
                  <Eye className="w-4 h-4 text-[#6B7280]" />
                )}
              </button>
              <button
                onClick={() => copyToClipboard(webhookSecret, "Webhook Secret")}
                className="p-3 hover:bg-[#F3F4F6] rounded-lg transition-colors"
                title="Copy secret"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-[#6B7280]" />
                )}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-[#6B7280]">
              <p>✓ Send as header: <code className="font-mono bg-[#F3F4F6] px-1">x-webhook-secret</code></p>
              <p>✓ Never share this secret publicly</p>
            </div>
          </div>
        </div>
      </div>

      {/* Regenerate Secret */}
      <div className="flex justify-end">
        <button
          onClick={regenerateSecret}
          disabled={loading}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors",
            loading
              ? "bg-[#E5E7EB] text-[#6B7280] cursor-not-allowed"
              : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
          )}
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Regenerate Secret
        </button>
      </div>

      {/* Integration Instructions */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <div className="bg-gradient-to-r from-[#EBF7EC] to-[#F0F9F4] px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="font-semibold text-[#1A1B1E]">Integration Guide</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-sm text-[#1A1B1E] mb-2">For Make.com:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-[#6B7280]">
              <li>In Make.com, create a new scenario with a trigger (Gmail, Klarity, ZocDoc, etc.)</li>
              <li>Add an HTTP module → POST request</li>
              <li>Paste the webhook URL above</li>
              <li>Add header: <code className="font-mono bg-[#F3F4F6] px-1">x-webhook-secret</code> with the secret</li>
              <li>Map patient data from trigger to request body:
                <div className="bg-[#F3F4F6] rounded p-2 mt-1 font-mono text-xs text-[#1A1B1E]">
                  name, email, phone,<br />
                  appointmentDatetime, vaName (optional), bookingPlatform
                </div>
              </li>
              <li>Test the webhook using the button below</li>
            </ol>
          </div>
          <div>
            <h3 className="font-semibold text-sm text-[#1A1B1E] mb-2">Request Body Example:</h3>
            <pre className="bg-[#F3F4F6] rounded p-3 overflow-x-auto text-xs text-[#1A1B1E]">{`{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "appointmentDatetime": "2026-08-10T14:00:00Z",
  "vaName": "Jude",
  "bookingPlatform": "klarity"
}`}</pre>
          </div>
        </div>
      </div>

      {/* Test Webhook */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <div className="bg-gradient-to-r from-[#EBF7EC] to-[#F0F9F4] px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="font-semibold text-[#1A1B1E]">Test Webhook</h2>
          <p className="text-xs text-[#6B7280] mt-1">Send a test request to verify your webhook is working</p>
        </div>
        <div className="p-6 space-y-4">
          <button
            onClick={testWebhook}
            disabled={testLoading}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors",
              testLoading
                ? "bg-[#E5E7EB] text-[#6B7280] cursor-not-allowed"
                : "bg-[#036638] text-white hover:bg-[#025030]"
            )}
          >
            <Zap className={cn("w-4 h-4", testLoading && "animate-spin")} />
            {testLoading ? "Testing..." : "Send Test Webhook"}
          </button>

          {testResponse && (
            <div className={cn(
              "rounded-lg p-4 border",
              testResponse.status === 201 || !testResponse.error
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            )}>
              <div className="flex items-start justify-between mb-2">
                <p className="font-semibold text-sm">
                  {testResponse.status === 201 || !testResponse.error ? "✓ Success" : "✗ Failed"}
                </p>
                <p className="text-xs text-[#6B7280]">
                  {new Date(testResponse.timestamp).toLocaleTimeString()}
                </p>
              </div>
              <pre className="bg-[#F3F4F6] rounded p-2 overflow-x-auto text-xs text-[#1A1B1E]">
                {JSON.stringify(testResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* VA Assignment Logic */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <div className="bg-gradient-to-r from-[#EBF7EC] to-[#F0F9F4] px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="font-semibold text-[#1A1B1E]">Auto-Assignment Logic</h2>
          <p className="text-xs text-[#6B7280] mt-1">How patients are automatically assigned to VAs</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-900 mb-2">Priority 1: VA Name from Webhook</p>
              <p className="text-xs text-blue-800">
                If you include <code className="font-mono bg-blue-100 px-1">"vaName"</code> in the webhook payload, the patient will be assigned to that specific VA. Example: <code className="font-mono bg-blue-100 px-1">"vaName": "Jude"</code>
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-green-900 mb-2">Priority 2: Appointment Time (Fallback)</p>
              <p className="text-xs text-green-800">
                If <code className="font-mono bg-green-100 px-1">vaName</code> is not provided or VA not found:
                <br />✓ Appointment time &lt; 12:00 PM → Assign to <strong>Jude</strong> (morning shift)
                <br />✓ Appointment time ≥ 12:00 PM → Assign to <strong>Amanda</strong> (evening shift)
                <br />✓ No appointment time → Left unassigned (VA can assign manually)
              </p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs font-semibold text-gray-900 mb-2">Example Scenarios</p>
            <div className="space-y-2 text-xs text-gray-800">
              <div>✓ <code className="font-mono bg-gray-100 px-1">"vaName": "Jude"</code> + 2:00 PM appointment → Assigned to <strong>Jude</strong> (explicit name wins)</div>
              <div>✓ No vaName + 2:00 PM appointment → Assigned to <strong>Amanda</strong> (time-based)</div>
              <div>✓ No vaName + 9:00 AM appointment → Assigned to <strong>Jude</strong> (time-based)</div>
              <div>✓ <code className="font-mono bg-gray-100 px-1">"vaName": "InvalidName"</code> + 10:00 AM → Assigned to <strong>Jude</strong> (fallback to time)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Recommendations */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900">
          <p className="font-semibold mb-1">Security Best Practices</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Keep your webhook secret confidential</li>
            <li>Regenerate secret regularly (e.g., quarterly)</li>
            <li>Only provide secret to trusted automation platforms</li>
            <li>All webhooks are validated with your secret header</li>
            <li>Consider rotating secrets if exposed</li>
          </ul>
        </div>
      </div>

      {/* Webhook Status */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
        <h2 className="font-semibold text-[#1A1B1E] mb-4">Webhook Status</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#6B7280]">Endpoint Status</p>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Active
            </span>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#6B7280]">Authentication</p>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Secret Header
            </span>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#6B7280]">Auto-Assignment</p>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Enabled (Jude &lt; 12pm, Amanda ≥ 12pm)
            </span>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

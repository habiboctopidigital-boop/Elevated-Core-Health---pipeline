"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/auth/useAuth"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { PatientsService } from "@/services/patients.service"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const BOOKING_PLATFORMS = [
  { value: "zocdoc", label: "ZocDoc" },
  { value: "klarity", label: "Klarity" },
  { value: "headway", label: "Headway" },
  { value: "grow_therapy", label: "Grow Therapy" },
  { value: "google", label: "Google" },
  { value: "phone", label: "Phone" },
  { value: "walk_in", label: "Walk-in" },
]

interface AddPatientFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  appointmentDatetime: string
  bookingPlatform: string
  assignedTo: string
}

export function AddPatientDialog() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<AddPatientFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    appointmentDatetime: "",
    bookingPlatform: "phone",
    assignedTo: "",
  })

  const queryClient = useQueryClient()

  const addPatientMutation = useMutation({
    mutationFn: async (data: AddPatientFormData) => {
      const name = `${data.firstName} ${data.lastName}`.trim()
      return await PatientsService.addPatient({
        name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        appointmentDatetime: data.appointmentDatetime || undefined,
        bookingPlatform: data.bookingPlatform as any,
        assignedTo: data.assignedTo || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] })
      toast.success("Patient added successfully")
      setOpen(false)
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        appointmentDatetime: "",
        bookingPlatform: "phone",
        assignedTo: "",
      })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to add patient")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.appointmentDatetime) {
      toast.error("First name, last name, and appointment date are required")
      return
    }
    addPatientMutation.mutate(formData)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="bg-[#036638] hover:bg-[#025030] text-white gap-2"
          size="sm"
        >
          <Plus className="w-4 h-4" />
          Add Patient
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Patient</DialogTitle>
          <DialogDescription>
            Add a new patient to the pipeline. They'll start in the Onboarding stage.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#1A1B1E]">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              placeholder="John"
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30"
              required
            />
          </div>

          {/* Last Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#1A1B1E]">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              placeholder="Doe"
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30"
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#1A1B1E]">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="john@example.com"
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30"
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#1A1B1E]">Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="(555) 123-4567"
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30"
            />
          </div>

          {/* Appointment Date/Time */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#1A1B1E]">
              Appointment Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              name="appointmentDatetime"
              value={formData.appointmentDatetime}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30"
              required
            />
          </div>

          {/* Booking Platform */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#1A1B1E]">Where They Came From</label>
            <select
              name="bookingPlatform"
              value={formData.bookingPlatform}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30"
            >
              {BOOKING_PLATFORMS.map((platform) => (
                <option key={platform.value} value={platform.value}>
                  {platform.label}
                </option>
              ))}
            </select>
          </div>

          {/* Assign To (optional) */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#1A1B1E]">Assign To (Optional)</label>
            <select
              name="assignedTo"
              value={formData.assignedTo}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#036638]/30"
            >
              <option value="">-- Unassigned --</option>
              {/* VAs will be loaded dynamically if needed */}
            </select>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={addPatientMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                addPatientMutation.isPending ||
                !formData.firstName.trim() ||
                !formData.lastName.trim() ||
                !formData.appointmentDatetime
              }
              className="bg-[#036638] hover:bg-[#025030] text-white"
            >
              {addPatientMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Adding...
                </>
              ) : (
                "Add Patient"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

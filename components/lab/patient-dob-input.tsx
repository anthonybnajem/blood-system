"use client";

import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatPatientDobFromDate, formatPatientDobInput, patientDobToDate } from "@/lib/patient-dob";

type PatientDobInputProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function PatientDobInput({ value, onChange, className }: PatientDobInputProps) {
  const selectedDate = patientDobToDate(value);

  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(formatPatientDobInput(e.target.value))}
        inputMode="numeric"
        placeholder="DD/MM/YYYY"
        className={className}
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="icon" aria-label="Pick date of birth">
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => onChange(formatPatientDobFromDate(date))}
            initialFocus
            captionLayout="dropdown"
            fromYear={1900}
            toYear={new Date().getFullYear()}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

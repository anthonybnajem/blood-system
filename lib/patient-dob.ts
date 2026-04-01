function pad2(value: string): string {
  return value.padStart(2, "0");
}

type PatientDobParts = {
  day: number;
  month: number;
  year: number;
};

function parsePatientDobParts(value?: string | null): PatientDobParts | null {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return {
      year: Number(isoMatch[1]),
      month: Number(isoMatch[2]),
      day: Number(isoMatch[3]),
    };
  }

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    return {
      day: Number(slashMatch[1]),
      month: Number(slashMatch[2]),
      year: Number(slashMatch[3]),
    };
  }

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 8) {
    return {
      day: Number(digits.slice(0, 2)),
      month: Number(digits.slice(2, 4)),
      year: Number(digits.slice(4)),
    };
  }

  return null;
}

export function getPatientDobValidationError(
  value?: string | null,
  today = new Date()
): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const parts = parsePatientDobParts(raw);
  if (!parts) {
    return "Date Of Birth must be in DD/MM/YYYY format";
  }

  const { day, month, year } = parts;

  if (month < 1 || month > 12) {
    return "Month must be between 1 and 12";
  }

  if (year < 1) {
    return "Year must be valid";
  }

  const maxDay = new Date(year, month, 0).getDate();
  if (day < 1 || day > maxDay) {
    return `Day must be between 1 and ${maxDay} for the selected month`;
  }

  const candidate = new Date(year, month - 1, day);
  candidate.setHours(0, 0, 0, 0);

  const currentDate = new Date(today);
  currentDate.setHours(0, 0, 0, 0);

  if (candidate.getTime() > currentDate.getTime()) {
    return "Date Of Birth cannot be in the future";
  }

  return null;
}

export function formatPatientDobInput(value?: string | null): string {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }

  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (!digits) return raw;

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function normalizePatientDobForStorage(value?: string | null): string {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const parts = parsePatientDobParts(raw);
  if (parts) {
    return `${String(parts.year).padStart(4, "0")}-${pad2(String(parts.month))}-${pad2(String(parts.day))}`;
  }

  return raw;
}

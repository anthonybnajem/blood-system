import * as yup from "yup";
import { getPatientDobValidationError } from "@/lib/patient-dob";

const patientGenderOptions = ["Male", "Female", "Other"] as const;
const inputTypeOptions = ["number", "text", "select", "boolean"] as const;

export const patientRequiredSchema = yup.object({
  firstName: yup.string().trim().required("First Name is required"),
  lastName: yup.string().trim().required("Last Name is required"),
  gender: yup
    .mixed<(typeof patientGenderOptions)[number]>()
    .oneOf(patientGenderOptions, "Gender is required")
    .required("Gender is required"),
  dateOfBirth: yup
    .string()
    .trim()
    .required("Date Of Birth is required")
    .test("patient-dob-valid", function validatePatientDob(value) {
      const error = getPatientDobValidationError(value);
      return error ? this.createError({ message: error }) : true;
    }),
  phone: yup.string().trim().required("Phone is required"),
  location: yup.string().trim().required("Location is required"),
});

export const categoryCreateSchema = yup.object({
  name: yup.string().trim().required("Category Name is required"),
});

export const categoryEditSchema = yup.object({
  departmentId: yup.string().trim().required("Category is required"),
  name: yup.string().trim().required("Category Name is required"),
  ordering: yup
    .number()
    .typeError("Order is required")
    .min(0, "Order must be 0 or greater")
    .required("Order is required"),
});

export const panelSchema = yup.object({
  name: yup.string().trim().required("Panel Name is required"),
  ordering: yup
    .number()
    .typeError("Order is required")
    .min(0, "Order must be 0 or greater")
    .required("Order is required"),
});

export const labInputSchema = yup.object({
  panelId: yup.string().trim().required("Panel is required"),
  displayName: yup.string().trim().required("Input Name is required"),
  resultType: yup
    .mixed<(typeof inputTypeOptions)[number]>()
    .oneOf(inputTypeOptions, "Type is required")
    .required("Type is required"),
});

export const reportDetailsSchema = yup.object({
  caseNo: yup.string().trim().required("Case No. is required"),
  physicianName: yup.string().trim(),
  visitDate: yup.string().trim().required("Date & Time is required"),
});

export const employeeCreateSchema = yup.object({
  name: yup.string().trim().required("Name is required"),
  email: yup.string().trim().email("Email must be valid").required("Email is required"),
  password: yup.string().trim().required("Password is required"),
});

export function getYupErrorMessages(schema: yup.AnyObjectSchema, value: unknown): string[] {
  return Object.values(getYupFieldErrors(schema, value));
}

export function getYupFieldErrors(
  schema: yup.AnyObjectSchema,
  value: unknown
): Record<string, string> {
  try {
    schema.validateSync(value, { abortEarly: false, stripUnknown: false });
    return {};
  } catch (error) {
    if (!(error instanceof yup.ValidationError)) {
      throw error;
    }

    const fieldErrors: Record<string, string> = {};
    const entries = error.inner.length > 0 ? error.inner : [error];

    for (const item of entries) {
      const path = item.path || "";
      const message = item.message || "";
      if (!path || !message || fieldErrors[path]) continue;
      fieldErrors[path] = message;
    }

    if (Object.keys(fieldErrors).length > 0) {
      return fieldErrors;
    }

    const messages = error.errors.filter(Boolean);
    if (messages[0]) {
      return { form: messages[0] };
    }

    return {};
  }
}

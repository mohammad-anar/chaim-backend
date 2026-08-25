import { z } from "zod";

const registerAmbassadorZodSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.email("Invalid email address"),
    phone: z.string().min(6, "Valid phone number is required"),
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
    recruitmentCode: z.string().optional(),
  }),
});

const loginAmbassadorZodSchema = z.object({
  body: z.object({
    identifier: z.string().min(1, "Email or phone number is required"),
    password: z.string().min(1, "Password is required").optional(),
  }),
});

const updateSettingsZodSchema = z.object({
  body: z.object({
    defaultModel: z.enum(["MODEL_A", "MODEL_B"]).optional(),
    payoutDetails: z
      .object({
        bankName: z.string().optional(),
        accountNumber: z.string().optional(),
        branchNumber: z.string().optional(),
        notes: z.string().optional(),
      })
      .optional(),
  }),
});

const selectAttributionModelZodSchema = z.object({
  body: z.object({
    attributionId: z.string().uuid("Invalid attribution ID"),
    model: z.enum(["MODEL_A", "MODEL_B"]),
  }),
});

const manualClaimApartmentZodSchema = z.object({
  body: z.object({
    ownerName: z.string().optional(),
    ownerPhone: z.string().min(6, "Owner phone number is required"),
    ownerEmail: z.string().email("Invalid owner email address").optional(),
    model: z.enum(["MODEL_A", "MODEL_B"]),
  }),
});

const requestPayoutZodSchema = z.object({
  body: z.object({
    amount: z.number().positive("Amount must be positive").optional(),
  }),
});

const adminReviewApplicationZodSchema = z.object({
  body: z.object({
    status: z.enum(["APPROVED", "REJECTED"]),
    customReferralCode: z.string().optional(),
    rates: z
      .object({
        modelAListing: z.number().optional(),
        modelARental: z.number().optional(),
        modelBListing: z.number().optional(),
        modelBRental: z.number().optional(),
        subReferralListing: z.number().optional(),
      })
      .optional(),
  }),
});

const adminRelinkAttributionZodSchema = z.object({
  body: z.object({
    attributionId: z.string().uuid("Invalid attribution ID"),
    newAmbassadorId: z.string().uuid("Invalid ambassador ID").optional(),
    newModel: z.enum(["MODEL_A", "MODEL_B"]).optional(),
  }),
});

const adminApproveFeeZodSchema = z.object({
  body: z.object({
    commissionId: z.string().uuid().optional(),
    sourceListingId: z.string().optional(),
  }),
});

const adminReverseCommissionZodSchema = z.object({
  body: z.object({
    commissionId: z.string().uuid("Invalid commission ID"),
    reason: z.string().min(2, "Reason is required"),
  }),
});

const adminProcessPayoutZodSchema = z.object({
  body: z.object({
    status: z.enum(["PAID", "REJECTED"]),
    referenceCode: z.string().optional(),
    rejectionReason: z.string().optional(),
  }),
});

export const AmbassadorValidation = {
  registerAmbassadorZodSchema,
  loginAmbassadorZodSchema,
  updateSettingsZodSchema,
  selectAttributionModelZodSchema,
  manualClaimApartmentZodSchema,
  requestPayoutZodSchema,
  adminReviewApplicationZodSchema,
  adminRelinkAttributionZodSchema,
  adminApproveFeeZodSchema,
  adminReverseCommissionZodSchema,
  adminProcessPayoutZodSchema,
};

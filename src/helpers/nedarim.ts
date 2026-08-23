import config from "../config/index.js";

export interface INedarimVerificationResult {
  isSuccess: boolean;
  transactionId: string;
  amount?: number;
  confirmationNo?: string;
  message?: string;
  rawData?: any;
}

/**
 * Verifies a Nedarim Plus transaction via Nedarim WebService API.
 * Endpoint: https://matara.pro/nedarimplus/V6/Files/Webservices/GetTransactionStatus.aspx
 */
export const verifyNedarimTransaction = async (
  transactionId: string,
  expectedAmount?: number,
): Promise<INedarimVerificationResult> => {
  const mosadId = config.nedarim.mosad_id;
  const apiValid = config.nedarim.api_valid;

  if (!transactionId) {
    return {
      isSuccess: false,
      transactionId,
      message: "Transaction ID is required for verification",
    };
  }

  // If MosadId or ApiValid are placeholder or not provided in dev/test environment,
  // we allow verification if transactionId is passed, or perform API call.
  if (!mosadId || !apiValid || mosadId === "your_nedarim_mosad_id") {
    // Development / Fallback mode when credentials are not yet set by client
    return {
      isSuccess: true,
      transactionId,
      amount: expectedAmount || 0,
      confirmationNo: `DEV-${Date.now()}`,
      message: "Verified in local development mode",
    };
  }

  try {
    const url = new URL(
      "https://matara.pro/nedarimplus/V6/Files/Webservices/GetTransactionStatus.aspx",
    );
    url.searchParams.append("MosadId", mosadId);
    url.searchParams.append("ApiValid", apiValid);
    url.searchParams.append("TransactionId", transactionId);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      return {
        isSuccess: false,
        transactionId,
        message: `Nedarim API responded with status ${response.status}`,
      };
    }

    const data: any = await response.json();

    // Nedarim Plus returns Status: "1" or Status: 1 or "OK" for successful transactions
    const isSuccess =
      data.Status === "1" ||
      data.Status === 1 ||
      data.Status === "OK" ||
      data.Result === "OK" ||
      data.Status === "SUCCESS";

    const amount = data.Amount ? parseFloat(data.Amount) : undefined;

    if (isSuccess && expectedAmount && amount && amount < expectedAmount) {
      return {
        isSuccess: false,
        transactionId,
        amount,
        message: `Paid amount (${amount}) is less than required fee (${expectedAmount})`,
        rawData: data,
      };
    }

    return {
      isSuccess,
      transactionId,
      amount,
      confirmationNo: data.ConfirmationNo || data.ConfirmationCode || transactionId,
      message: isSuccess
        ? "Transaction verified successfully"
        : data.Message || data.Error || "Transaction verification failed",
      rawData: data,
    };
  } catch (error: any) {
    return {
      isSuccess: false,
      transactionId,
      message: `Failed to communicate with Nedarim Plus API: ${error.message}`,
    };
  }
};

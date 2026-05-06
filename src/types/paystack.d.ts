declare module "@paystack/inline-js" {
  export default class PaystackPop {
    newTransaction(options: {
      key: string;
      email: string;
      amount: number;
      currency?: string;
      reference?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      metadata?: Record<string, unknown>;
      onSuccess?: (transaction: { reference: string; status: string }) => void;
      onCancel?: () => void;
      onError?: (error: { message: string }) => void;
    }): void;
  }
}

import {
  DisabledReceiptVerifier,
  HttpReceiptVerifier,
  PurchaseService,
} from "./PurchaseService";

declare global {
  var __BAOZOU_MONETIZATION_AUTH__:
    | { getIdToken(): Promise<string | null> }
    | undefined;
}

let service: PurchaseService | undefined;

export function purchaseService(): PurchaseService {
  if (!service) {
    const endpoint =
      globalThis.__BAOZOU_MONETIZATION_CONFIG__?.receiptVerificationUrl;
    service = new PurchaseService(
      undefined,
      endpoint && globalThis.__BAOZOU_MONETIZATION_AUTH__
        ? new HttpReceiptVerifier(
            endpoint,
            globalThis.__BAOZOU_MONETIZATION_AUTH__,
          )
        : new DisabledReceiptVerifier(),
    );
  }
  return service;
}

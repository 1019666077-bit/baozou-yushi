"use strict";

const crypto = require("node:crypto");

class ReceiptStore {
  async claim(_purchaseToken, _record) {
    throw new Error("ReceiptStore.claim must be implemented");
  }

  async listEntitlements(_userId) {
    throw new Error("ReceiptStore.listEntitlements must be implemented");
  }

  async revoke(_purchaseToken, _reason) {
    throw new Error("ReceiptStore.revoke must be implemented");
  }
}

class FirestoreReceiptStore extends ReceiptStore {
  constructor(firestore, collectionName = "googlePlayReceipts") {
    super();
    this.firestore = firestore;
    this.collectionName = collectionName;
  }

  async claim(purchaseToken, record) {
    const receiptId = crypto
      .createHash("sha256")
      .update(purchaseToken)
      .digest("hex");
    const ref = this.firestore.collection(this.collectionName).doc(receiptId);
    return this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (snapshot.exists) {
        return { acquired: false, record: snapshot.data() };
      }
      const stored = {
        ...record,
        purchaseToken,
        processedAt: Date.now(),
        revokedAt: null,
      };
      transaction.create(ref, {
        ...stored,
      });
      return { acquired: true, record: stored };
    });
  }

  async listEntitlements(userId) {
    const snapshot = await this.firestore
      .collection(this.collectionName)
      .where("userId", "==", userId)
      .where("kind", "in", ["permanent", "cosmetic"])
      .get();
    return snapshot.docs
      .map((doc) => doc.data())
      .filter((record) => !record.revokedAt);
  }

  async revoke(purchaseToken, reason) {
    const ref = this.firestore.collection(this.collectionName).doc(purchaseToken);
    await ref.set(
      { revokedAt: Date.now(), revocationReason: String(reason || "unknown") },
      { merge: true },
    );
  }
}

module.exports = { ReceiptStore, FirestoreReceiptStore };

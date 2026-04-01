const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const paystackService = require("../services/paystackService");
const walletService = require("../services/walletService");
const { Transaction } = require("../models");

router.post("/paystack", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET || "";
    if (!secret) {
      return res.status(503).send("PAYSTACK_SECRET not configured");
    }

    const signature = req.headers["x-paystack-signature"];
    const expected = crypto
      .createHmac("sha512", secret)
      .update(req.body)
      .digest("hex");

    if (String(signature || "") !== expected) {
      return res.status(401).send("Invalid signature");
    }

    const event = JSON.parse(req.body.toString("utf8"));
    if (event?.event !== "charge.success") {
      return res.sendStatus(200);
    }

    const reference = String(event?.data?.reference || "").trim();
    if (!reference) {
      return res.status(400).send("Missing reference");
    }

    // Verify with Paystack API as an extra integrity check.
    const verify = await paystackService.verifyTransaction(reference);
    const data = verify?.data || {};
    const metadata = data?.metadata || {};
    const userId = Number(metadata.userId);
    const amount = Number(data.amount || 0) / 100;

    if (!verify?.status || data?.status !== "success" || !userId || !amount) {
      await Transaction.update(
        { status: "failed", description: "Paystack webhook verification failed" },
        { where: { reference } }
      );
      return res.sendStatus(200);
    }

    await walletService.credit(userId, amount, `paystack:${reference}`);

    await Transaction.update(
      { status: "completed", description: "Paystack wallet top-up completed (webhook)" },
      { where: { reference } }
    );

    return res.sendStatus(200);
  } catch (err) {
    console.error("PAYSTACK WEBHOOK ERROR:", err?.response?.data || err.message || err);
    return res.sendStatus(500);
  }
});

module.exports = router;

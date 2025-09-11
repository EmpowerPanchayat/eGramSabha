const express = require("express");
const multer = require("multer");
const path = require("path");
const jioSign = require("../services/jioSignService");

const GramSabha = require("../models/gramSabha");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Replace with your publicly reachable callback endpoint
const SIGNING_CALLBACK_URL =
  process.env.JIOSIGN_CALLBACK_URL ||
  "https://gramsabhalive.empowerpanchayat.org/";

/**
 * POST /api/jiosign/send-for-signing
 * Body (multipart/form-data):
 *  - pdf: (file)
 *  - documentName: string
 *  - signatures: JSON string array of { identifier, coords?: { x, y, w?, h?, page? } }
 *  - gramSabhaId: ID of the Gram Sabha meeting
 *  - initiator?: string  // optional – identifier of the user to receive OTP for sign-initiate
 *  - fileName?: string   // optional – override uploaded name
 */
router.post("/send-for-signing", upload.single("pdf"), async (req, res) => {
  try {
    const { documentName, signatures, initiator, fileName, gramSabhaId } =
      req.body;
    const pdfFile = req.file;
    console.log("=== Incoming Request ===");

    console.log("Body:", req.body); // Form fields like documentName, signatures, etc.
    console.log("File:", req.file);
    if (!documentName || !pdfFile || !signatures || !gramSabhaId) {
      return res.status(400).json({
        error:
          "documentName, pdf file, signatures, and gramSabhaId are required.",
      });
    }

    let parsedSignatures;
    try {
      parsedSignatures = JSON.parse(signatures);
    } catch (e) {
      return res
        .status(400)
        .json({ error: "signatures must be a valid JSON array" });
    }

    if (!Array.isArray(parsedSignatures) || parsedSignatures.length === 0) {
      return res
        .status(400)
        .json({ error: "signatures array cannot be empty" });
    }

    // Step 1 → Create envelope
    const groupId = await jioSign.createDocumentEnvelope(
      documentName,
      "product@empowerpanchayat.org"
    );
    console.log("Signatures raw:", req.body.signatures);
    console.log("Signatures parsed:", parsedSignatures);

    // Step 2 → Save data (upload PDF + participants/signers)
    await jioSign.saveDocumentData(groupId, pdfFile.buffer, parsedSignatures, {
      fileName: documentName || pdfFile.filename || "document.pdf",
    });

    // Step 3: Find and Update GramSabha Document in DB
    const gramSabha = await GramSabha.findById(gramSabhaId);
    if (!gramSabha) {
      throw new Error(`Gram Sabha with ID ${gramSabhaId} not found`);
    }

    gramSabha.agendaGroupId = groupId;
    gramSabha.agendaSigningStatus = "PENDING";
    gramSabha.agendaSignatories = parsedSignatures.map((s) => ({
      identifier: s.identifier,
      name: s.name,
      role: s.role,
      status: "PENDING",
    }));

    await gramSabha.save();

    // Step 4 → Initiate signing (OTP will go to provided initiator or first signer)
    const initIdentifier = initiator || parsedSignatures[0]?.identifier;
    if (!initIdentifier)
      throw new Error("No initiator identifier found to initiate sign flow");

    return res.status(200).json({
      success: true,
      message: "Document signing process initiated and saved successfully.",
      groupId,
      gramSabhaId: gramSabha._id,
    });
  } catch (err) {
    // Normalize axios errors
    if (err.response) {
      const { status, data } = err.response;
      return res.status(status || 500).json({ error: data || err.message });
    }
    console.error("Error in /send-for-signing:", err);
    return res
      .status(500)
      .json({ error: err.message || "Internal Server Error" });
  }
});

// Route: Check document status and download if completed
router.get("/doc-status/:groupId", async (req, res) => {
  const groupId = req.params.groupId;

  try {
    const status = await jioSign.checkStatus(groupId);
    if (status === "COMPLETED") {
      res.json({
        success: true,
        message: "Document signed and downloaded",
        groupId,
      });
    } else {
      res.json({
        success: true,
        message: `Document status: ${status}`,
        groupId,
      });
    }
  } catch (err) {
    console.error(" Error in /doc-status route:", err);
    res
      .status(500)
      .json({ success: false, error: err.response?.data || err.message });
  }
});

router.get("/signed-file/:groupId", async (req, res) => {
  try {
    const { groupId } = req.params;
    const { gramSabhaId } = req.query;

    const gramSabha = await GramSabha.findById(gramSabhaId);

    // ✅ Already saved → return from DB
    if (gramSabha?.signedAgendaPDF?.data) {
      res.setHeader("Content-Type", gramSabha.signedAgendaPDF.contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="signed_agenda_${groupId}.pdf"`
      );
      return res.send(gramSabha.signedAgendaPDF.data.buffer); // ⚡ note .buffer if using Mixed
    }

    // ❌ Not saved → download fresh
    const pdfBuffer = await jioSign.downloadSignedDocument(groupId);

    // Save in Mongo
    if (gramSabha) {
      gramSabha.signedAgendaPDF = {
        data: pdfBuffer,
        contentType: "application/pdf",
      };
      await gramSabha.save();
    }

    // Send to client
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="signed_agenda_${groupId}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (err) {
    console.error("Error in /signed-file:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

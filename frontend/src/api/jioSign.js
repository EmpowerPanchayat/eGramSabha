// api/jioSign.js
import axios from "../utils/axiosConfig";

/**
 * Send agenda document for signing via JioSign.
 * @param {FormData} formData - The form data containing the PDF and signature details.
 * @returns {Promise<any>}
 */
export const sendAgendaForSigning = async (formData) => {
  try {
    const response = await axios.post("/jiosign/send-for-signing", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error(
      "Error sending agenda for signing:",
      error.response?.data || error.message
    );
    throw new Error(
      error.response?.data?.message || "Failed to send agenda for signing"
    );
  }
};

/**
 * Check document status and download signed PDF if available.
 * @param {string} groupId - The JioSign group ID.
 * @returns {Promise<{status: string, downloaded?: boolean}>}
 */
// api/jioSign.js
export const checkDocStatus = async (groupId) => {
  try {
    const response = await axios.get(`/jiosign/doc-status/${groupId}`);
    return response.data; // will contain { success, message, groupId }
  } catch (error) {
    console.error(
      "Error checking doc status:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const handleDownloadSignedAgenda = async (groupId, gramSabhaId) => {
  try {
    const response = await axios.get(`/jiosign/signed-file/${groupId}`, {
      params: { gramSabhaId },
      responseType: "arraybuffer", // must be arraybuffer for raw binary
    });

    // Create Blob from ArrayBuffer
    const blob = new Blob([response.data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);

    // Create temporary link
    const link = document.createElement("a");
    link.href = url;
    link.download = `signed_agenda_${groupId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    // Free memory
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error(
      "Error downloading signed agenda:",
      error.response?.data || error.message
    );
    throw error;
  }
};

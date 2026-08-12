"use strict";

/* ============================================================
   PDF LIBRARY
   ============================================================ */

if (typeof PDFLib === "undefined") {
  throw new Error(
    "PDFLib load nahi hua. Check karo ki pdf-lib script index.html me load hai.",
  );
}

const { PDFDocument, StandardFonts } = PDFLib;

/* ============================================================
   DOM ELEMENTS
   ============================================================ */

const generateBtn = document.getElementById("generateBtn");
const qrFileInput = document.getElementById("qrFile");
const qrStatus = document.getElementById("qrStatus");
const message = document.getElementById("message");

if (!generateBtn) {
  throw new Error('Element "generateBtn" nahi mila.');
}

/* ============================================================
   PAGE SIZE FROM YOUR NEW PDF
   ============================================================ */

const PAGE_WIDTH = 255.12;
const PAGE_HEIGHT = 453.6;

/* ============================================================
   TEMPLATE FIELD POSITIONS
   ============================================================

   Original PDF labels:

   Name:-              y1 = 58.76
   Account Number:-    y1 = 77.36
   CIF Number:-        y1 = 96.08
   IFSC Code:-         y1 = 114.80
   Branch Name:-       y1 = 133.52
   B.O Name:-          y1 = 152.27
   Account Type:-      y1 = 170.99
   Opening Date:-      y1 = 189.71

   PyMuPDF Y = top se
   PDF-Lib Y = bottom se

   PDF-Lib value Y = PAGE_HEIGHT - y1

============================================================ */

const TEMPLATE = {
  fontSize: 11,

  fields: {
    name: {
      x: 50.0,
      y: PAGE_HEIGHT - 58.76,
    },

    accountNumber: {
      x: 102.0,
      y: PAGE_HEIGHT - 77.36,
    },

    cif: {
      x: 78.0,
      y: PAGE_HEIGHT - 96.08,
    },

    ifsc: {
      x: 71.0,
      y: PAGE_HEIGHT - 114.8,
    },

    branch: {
      x: 86.0,
      y: PAGE_HEIGHT - 133.52,
    },

    boName: {
      x: 68.0,
      y: PAGE_HEIGHT - 152.27,
    },

    accountType: {
      x: 85.0,
      y: PAGE_HEIGHT - 170.99,
    },

    openingDate: {
      x: 86.0,
      y: PAGE_HEIGHT - 189.71,
    },
  },

  /* ==========================================================
     QR POSITION

     Existing working position retained.
  ========================================================== */

  qr: {
    x: 450,
    y: 100,
    width: 80,
    height: 80,
  },
};

/* ============================================================
   GET INPUT VALUE
   ============================================================ */

function getValue(id) {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Input "${id}" nahi mila.`);
  }

  return element.value.trim();
}

/* ============================================================
   DATE FORMAT
   YYYY-MM-DD -> DD-MM-YYYY
   ============================================================ */

function formatDate(value) {
  if (!value) {
    return "";
  }

  const parts = value.split("-");

  if (parts.length !== 3) {
    return value;
  }

  const year = parts[0];
  const month = parts[1];
  const day = parts[2];

  return `${day}-${month}-${year}`;
}

/* ============================================================
   FORM DATA
   ============================================================ */

function getFormData() {
  return {
    name: getValue("name"),

    accountNumber: getValue("accountNumber"),

    cif: getValue("cif"),

    ifsc: getValue("ifsc").toUpperCase(),

    branch: getValue("branch"),

    boName: getValue("boName"),

    accountType: getValue("accountType"),

    openingDate: formatDate(getValue("openingDate")),
  };
}

/* ============================================================
   VALIDATION
   ============================================================ */

function validateForm(data) {
  const fields = [
    ["Name", data.name],
    ["Account Number", data.accountNumber],
    ["CIF Number", data.cif],
    ["IFSC Code", data.ifsc],
    ["Branch Name", data.branch],
    ["Address", data.boName],
    ["Account Type", data.accountType],
    ["Opening Date", data.openingDate],
  ];

  for (const [label, value] of fields) {
    if (!value) {
      throw new Error(`${label} enter karo.`);
    }
  }
}

/* ============================================================
   LOAD TEMPLATE PDF
   ============================================================ */

async function loadTemplate() {
  const response = await fetch("./template/blank-template.pdf", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Template PDF load nahi hua. HTTP ${response.status}`);
  }

  const bytes = await response.arrayBuffer();

  if (bytes.byteLength < 5) {
    throw new Error("Template PDF empty ya invalid hai.");
  }

  const header = new TextDecoder().decode(bytes.slice(0, 5));

  if (header !== "%PDF-") {
    throw new Error("blank-template.pdf actual PDF nahi hai.");
  }

  return bytes;
}

/* ============================================================
   IMAGE -> PNG
   ============================================================ */

async function imageToPng(file) {
  if (!file) {
    throw new Error("QR image select karo.");
  }

  const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Sirf PNG, JPG ya WEBP image allowed hai.");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();

    await new Promise((resolve, reject) => {
      image.onload = resolve;

      image.onerror = () => {
        reject(new Error("Image load nahi ho saki."));
      };

      image.src = objectUrl;
    });

    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error("Image dimensions invalid hain.");
    }

    const canvas = document.createElement("canvas");

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas available nahi hai.");
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => {
        if (!result) {
          reject(new Error("Image ko PNG me convert nahi kiya ja saka."));

          return;
        }

        resolve(result);
      }, "image/png");
    });

    return await blob.arrayBuffer();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/* ============================================================
   DRAW VALUE
   ============================================================ */

function drawValue(page, value, position, font) {
  if (!value) {
    return;
  }

  page.drawText(String(value), {
    x: position.x,
    y: position.y,
    size: TEMPLATE.fontSize,

    /*
       Helvetica normal rakha hai.
       Pehle HelveticaBold ki wajah se value
       unnecessarily bold aa rahi thi.
    */

    font: font,
  });
}

/* ============================================================
   DOWNLOAD PDF
   ============================================================ */

function downloadPdf(pdfBytes, filename) {
  const blob = new Blob([pdfBytes], {
    type: "application/pdf",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);

  link.click();

  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/* ============================================================
   QR FILE SELECT
   ============================================================ */

if (qrFileInput) {
  qrFileInput.addEventListener("change", () => {
    const file = qrFileInput.files[0];

    if (!file) {
      if (qrStatus) {
        qrStatus.textContent = "";
      }

      return;
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      qrFileInput.value = "";

      if (qrStatus) {
        qrStatus.textContent = "PNG, JPG ya WEBP select karo.";
      }

      return;
    }

    if (qrStatus) {
      qrStatus.textContent = "Image selected ✓";
    }
  });
}

/* ============================================================
   GENERATE PDF
   ============================================================ */

generateBtn.addEventListener("click", async () => {
  try {
    generateBtn.disabled = true;

    if (message) {
      message.textContent = "PDF generate ho raha hai...";
    }

    /* ======================================================
         FORM DATA
      ====================================================== */

    const data = getFormData();

    validateForm(data);

    /* ======================================================
         QR IMAGE
      ====================================================== */

    const imageFile = qrFileInput ? qrFileInput.files[0] : null;

    if (!imageFile) {
      throw new Error("QR image select karo.");
    }

    /* ======================================================
         LOAD TEMPLATE
      ====================================================== */

    const templateBytes = await loadTemplate();

    /* ======================================================
         LOAD PDF
      ====================================================== */

    const pdfDoc = await PDFDocument.load(templateBytes);

    const pages = pdfDoc.getPages();

    if (!pages.length) {
      throw new Error("PDF me koi page nahi mila.");
    }

    const page = pages[0];

    /* ======================================================
         FONT

         Normal Helvetica use kiya hai.
         Bold nahi.
      ====================================================== */

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    /* ======================================================
         PAGE SIZE CHECK
      ====================================================== */

    const { width, height } = page.getSize();

    console.log("PDF Width:", width);

    console.log("PDF Height:", height);

    /* ======================================================
         DRAW VALUES

         Existing PDF labels ko touch nahi karna.
      ====================================================== */

    drawValue(page, data.name, TEMPLATE.fields.name, font);

    drawValue(page, data.accountNumber, TEMPLATE.fields.accountNumber, font);

    drawValue(page, data.cif, TEMPLATE.fields.cif, font);

    drawValue(page, data.ifsc, TEMPLATE.fields.ifsc, font);

    drawValue(page, data.branch, TEMPLATE.fields.branch, font);

    drawValue(page, data.boName, TEMPLATE.fields.boName, font);

    drawValue(page, data.accountType, TEMPLATE.fields.accountType, font);

    drawValue(page, data.openingDate, TEMPLATE.fields.openingDate, font);

    /* ======================================================
         QR IMAGE
      ====================================================== */

    const imageBytes = await imageToPng(imageFile);

    const embeddedImage = await pdfDoc.embedPng(imageBytes);

    page.drawImage(embeddedImage, {
      x: TEMPLATE.qr.x,
      y: TEMPLATE.qr.y,
      width: TEMPLATE.qr.width,
      height: TEMPLATE.qr.height,
    });

    /* ======================================================
         SAVE
      ====================================================== */

    const pdfBytes = await pdfDoc.save();

    /* ======================================================
         DOWNLOAD
      ====================================================== */

    downloadPdf(pdfBytes, "ippb-account-document.pdf");

    if (message) {
      message.textContent = "PDF successfully generated ✓";
    }
  } catch (error) {
    console.error("PDF ERROR:", error);

    if (message) {
      message.textContent = "PDF generate nahi ho saka.";
    }

    alert(error?.message || "PDF generation failed.");
  } finally {
    generateBtn.disabled = false;
  }
});

"use strict";

/* ============================================================
   PDF-LIB CHECK
   ============================================================ */

if (typeof PDFLib === "undefined") {
  throw new Error(
    "PDFLib load nahi hua. index.html me pdf-lib script check karo.",
  );
}

const { PDFDocument, StandardFonts, rgb } = PDFLib;

/* ============================================================
   DOM
   ============================================================ */

const generateBtn = document.getElementById("generateBtn");
const qrFileInput = document.getElementById("qrFile");
const qrStatus = document.getElementById("qrStatus");
const message = document.getElementById("message");

if (!generateBtn) {
  throw new Error("generateBtn nahi mila.");
}

/* ============================================================
   PAGE / TEMPLATE
   ============================================================ */

/*
  PDF size:
  Width  = 255.12 pt
  Height = 453.60 pt

  Original PDF labels ke coordinates analyzer se liye gaye hain.

  PyMuPDF:
      Y = top se

  PDF-Lib:
      Y = bottom se

  Isliye:
      PDF-Lib Y = 453.60 - PyMuPDF y1
*/

/* ============================================================
   FIELD CONFIG
   ============================================================ */

const TEMPLATE = {
  pageWidth: 255.12,

  pageHeight: 453.6,

  fontSize: 9.96,

  /*
    Original labels ke right edge ke baad
    thoda sa gap rakha gaya hai.
  */

  fields: {
    name: {
      x: 47.0,
      y: 395.84,
      maxWidth: 142.0,
    },

    accountNumber: {
      x: 99.2,
      y: 377.24,
      maxWidth: 91.0,
    },

    cif: {
      x: 75.6,
      y: 358.52,
      maxWidth: 114.0,
    },

    ifsc: {
      x: 68.8,
      y: 339.8,
      maxWidth: 121.0,
    },

    branch: {
      x: 84.5,
      y: 321.08,
      maxWidth: 106.0,
    },

    boName: {
      x: 66.8,
      y: 302.33,
      maxWidth: 124.0,
    },

    accountType: {
      x: 83.5,
      y: 283.61,
      maxWidth: 107.0,
    },

    openingDate: {
      x: 84.5,
      y: 264.89,
      maxWidth: 106.0,
    },
  },

  /*
    Actual QR/SCAN box:

    PyMuPDF:
      x = 192.05
      y = 294.35
      width = 52.50
      height = 53.50

    PDF-Lib:
      y = 105.75
  */

  qr: {
    x: 196.0,
    y: 109.5,
    width: 44.5,
    height: 45.5,
  },
};

/* ============================================================
   GET VALUE
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

    ["B.O Name", data.boName],

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
   LOAD TEMPLATE
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
    throw new Error("Template PDF empty hai.");
  }

  const header = new TextDecoder().decode(bytes.slice(0, 5));

  if (header !== "%PDF-") {
    throw new Error("blank-template.pdf valid PDF nahi hai.");
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
        reject(new Error("QR image load nahi ho saki."));
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
          reject(new Error("PNG conversion failed."));

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

    font: font,

    color: rgb(0, 0, 0),

    maxWidth: position.maxWidth,

    lineHeight: TEMPLATE.fontSize,
  });
}

/* ============================================================
   DOWNLOAD
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

    /* -----------------------------------------
         DATA
      ----------------------------------------- */

    const data = getFormData();

    validateForm(data);

    /* -----------------------------------------
         QR IMAGE
      ----------------------------------------- */

    const imageFile = qrFileInput ? qrFileInput.files[0] : null;

    if (!imageFile) {
      throw new Error("QR image select karo.");
    }

    /* -----------------------------------------
         TEMPLATE
      ----------------------------------------- */

    const templateBytes = await loadTemplate();

    /* -----------------------------------------
         PDF
      ----------------------------------------- */

    const pdfDoc = await PDFDocument.load(templateBytes);

    const pages = pdfDoc.getPages();

    if (!pages.length) {
      throw new Error("PDF me koi page nahi mila.");
    }

    const page = pages[0];

    /* -----------------------------------------
         FONT
      ----------------------------------------- */

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    /* -----------------------------------------
         PAGE DEBUG
      ----------------------------------------- */

    const { width, height } = page.getSize();

    console.log("PDF width:", width);

    console.log("PDF height:", height);

    /* -----------------------------------------
         TEXT VALUES ONLY

         Existing PDF labels already hain.
         Yahan labels dobara draw nahi honge.
      ----------------------------------------- */

    drawValue(page, data.name, TEMPLATE.fields.name, font);

    drawValue(page, data.accountNumber, TEMPLATE.fields.accountNumber, font);

    drawValue(page, data.cif, TEMPLATE.fields.cif, font);

    drawValue(page, data.ifsc, TEMPLATE.fields.ifsc, font);

    drawValue(page, data.branch, TEMPLATE.fields.branch, font);

    drawValue(page, data.boName, TEMPLATE.fields.boName, font);

    drawValue(page, data.accountType, TEMPLATE.fields.accountType, font);

    drawValue(page, data.openingDate, TEMPLATE.fields.openingDate, font);

    /* -----------------------------------------
         QR
      ----------------------------------------- */

    const imageBytes = await imageToPng(imageFile);

    const embeddedImage = await pdfDoc.embedPng(imageBytes);

    page.drawImage(embeddedImage, {
      x: TEMPLATE.qr.x,

      y: TEMPLATE.qr.y,

      width: TEMPLATE.qr.width,

      height: TEMPLATE.qr.height,
    });

    /* -----------------------------------------
         SAVE
      ----------------------------------------- */

    const pdfBytes = await pdfDoc.save();

    /* -----------------------------------------
         DOWNLOAD
      ----------------------------------------- */

    downloadPdf(pdfBytes, "generated-account-document.pdf");

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

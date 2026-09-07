/**
 * AccelRestaurants Google Sheets Data Proxy
 * 
 * Deployment Instructions:
 * 1. Open your Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Paste this code into the editor.
 * 4. Click "Deploy" > "New Deployment".
 * 5. Select type: "Web App".
 * 6. Set "Execute as": "Me".
 * 7. Set "Who has access": "Anyone".
 * 8. Copy the "Web App URL" and paste it into the AccelRestaurants Slide Editor.
 */

function doGet(e) {
  const sheetId = e.parameter.id;
  const sheetName = e.parameter.sheet || "Sheet1";
  const rangeParam = e.parameter.range;
  const col = e.parameter.col || "A";
  const row = parseInt(e.parameter.row) || 1;
  
  if (!sheetId) {
    return createResponse({ error: "Missing Workbook ID" });
  }

  try {
    const ss = SpreadsheetApp.openById(sheetId);
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      return createResponse({ error: "Sheet not found: " + sheetName });
    }

    if (rangeParam) {
      const range = sheet.getRange(rangeParam);
      const values = range.getValues();
      return createResponse({ values: values });
    }

    const range = sheet.getRange(col + row);
    const value = range.getDisplayValue();

    return createResponse({ value: value });
  } catch (err) {
    return createResponse({ error: err.toString() });
  }
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

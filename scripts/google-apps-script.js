// --- READ DATA FROM ALL SHEETS (Called by Next.js) ---
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    var data = [];

    for (var s = 0; s < sheets.length; s++) {
      var sheet = sheets[s];
      var sheetName = sheet.getName();

      // Ignore the Sold tracking sheet
      if (sheetName === "Sold") {
        continue;
      }

      var rows = sheet.getDataRange().getValues();
      if (rows.length > 0 && rows[0][0] !== "") {
        var headers = rows[0];

        for (var i = 1; i < rows.length; i++) {
          var row = rows[i];
          var item = {};
          for (var j = 0; j < headers.length; j++) {
            item[headers[j]] = row[j];
          }
          // Only send approved and unsold cards to the app
          if (item['Approved'] === true && item['Sold'] === false) {
            data.push(item);
          }
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ "inventory": data }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      "status": "error",
      "message": error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// --- WRITE DATA TO THE APPROPRIATE SHEET WITH AUTOMATIC EBAY PRICING ---
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);

    // Determine the target sheet based on Category
    var sheetName = data['Category'] || "Uncategorized";
    var sheet = ss.getSheetByName(sheetName);

    var expectedHeaders = ['ID', 'Name', 'Set', 'Year', 'Category', 'PriceBin', 'Parallel', 'Serial', 'Auto', 'CardCondition', 'ConditionValue', 'ConditionId', 'Graded', 'Manufacturer', 'CardNumber', 'ImageURL', 'ImageURLBack', 'Approved', 'Sold', 'Sport', 'AveragePrice', 'LastUpdated'];

    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(expectedHeaders);
    }

    var lastRow = sheet.getLastRow();
    var headers = [];

    if (lastRow > 0) {
      headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    }

    // Create headers or add missing ones
    if (lastRow === 0 || headers.length === 0 || headers[0] === "") {
      sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
      headers = expectedHeaders;
    } else {
      var missingHeaders = expectedHeaders.filter(function(h) { return headers.indexOf(h) === -1; });
      if (missingHeaders.length > 0) {
        var newHeaders = headers.concat(missingHeaders);
        sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]);
        headers = newHeaders;
      }
    }

    // Map incoming data
    var newRow = [];
    for (var i = 0; i < headers.length; i++) {
      var headerName = headers[i];
      if (data[headerName] !== undefined) {
        newRow.push(data[headerName]);
      } else {
        if (headerName === 'Approved') newRow.push(false);
        else if (headerName === 'Sold') newRow.push(false);
        else if (headerName === 'Sport') newRow.push("Uncategorized");
        else if (headerName === 'AveragePrice') newRow.push("");
        else if (headerName === 'LastUpdated') newRow.push("");
        else newRow.push("");
      }
    }

    // Automatically construct a combined query string from incoming fields
    var queryParts = [];
    if (data['Year']) queryParts.push(data['Year']);
    if (data['Set']) queryParts.push(data['Set']);
    if (data['Name']) queryParts.push(data['Name']);
    if (data['Parallel']) queryParts.push(data['Parallel']);
    if (data['Auto'] === true || data['Auto'] === "true" || data['Auto'] === "TRUE") queryParts.push("Auto");
    if (data['Serial']) queryParts.push(data['Serial']);

    var searchQuery = queryParts.join(" ");

    if (searchQuery !== "") {
      var ebayPrice = getAverageEbayPrice(searchQuery);
      var avgPriceIndex = headers.indexOf('AveragePrice');
      var lastUpdatedIndex = headers.indexOf('LastUpdated');

      if (ebayPrice !== null) {
        if (avgPriceIndex !== -1) newRow[avgPriceIndex] = ebayPrice;
        if (lastUpdatedIndex !== -1) newRow[lastUpdatedIndex] = new Date();
      } else {
        if (avgPriceIndex !== -1) newRow[avgPriceIndex] = "No listings found";
      }
    }

    // Append the new row
    sheet.appendRow(newRow);

    // Initialize checkboxes
    var appendedRowIndex = sheet.getLastRow();
    var approvedColIndex = headers.indexOf('Approved') + 1;
    var soldColIndex = headers.indexOf('Sold') + 1;
    var gradedColIndex = headers.indexOf('Graded') + 1;

    var checkboxRule = SpreadsheetApp.newDataValidation().requireCheckbox().build();

    if (approvedColIndex > 0) {
      var approvedCell = sheet.getRange(appendedRowIndex, approvedColIndex);
      approvedCell.setDataValidation(checkboxRule);
      approvedCell.setValue(false);
    }

    if (soldColIndex > 0) {
      var soldCell = sheet.getRange(appendedRowIndex, soldColIndex);
      soldCell.setDataValidation(checkboxRule);
      soldCell.setValue(false);
    }

    // Set validation for the Graded field as well if not already checked in data mapping
    if (gradedColIndex > 0) {
      var gradedCell = sheet.getRange(appendedRowIndex, gradedColIndex);
      gradedCell.setDataValidation(checkboxRule);
      var gradedValue = data['Graded'];
      gradedCell.setValue(gradedValue === true || String(gradedValue).toLowerCase() === 'true');
    }

    return ContentService.createTextOutput(JSON.stringify({
      "status": "success",
      "message": "Card added to " + sheetName + " and priced successfully."
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      "status": "error",
      "message": error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// --- AUTOMATICALLY MOVE AND TRACK SOLD ITEMS ---
function onEdit(e) {
  try {
    var sheet = e.source.getActiveSheet();
    var range = e.range;
    var sheetName = sheet.getName();

    // Prevent trigger from running on the "Sold" sheet or title row
    if (sheetName === "Sold" || range.getRow() === 1) {
      return;
    }

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var soldColIndex = headers.indexOf("Sold") + 1;

    // If the checkbox in the Sold column is checked
    if (soldColIndex > 0 && range.getColumn() === soldColIndex && range.getValue() === true) {
      var rowData = sheet.getRange(range.getRow(), 1, 1, sheet.getLastColumn()).getValues()[0];
      var ss = e.source;
      var soldSheet = ss.getSheetByName("Sold");

      if (!soldSheet) {
        soldSheet = ss.insertSheet("Sold");
        soldSheet.appendRow(headers.concat(["DateSold"]));
      }

      // Append row with DateSold column
      soldSheet.appendRow(rowData.concat([new Date()]));

      // Calculate and update running total
      updateSoldTotal(soldSheet, headers);

      // Remove row from category sheet
      sheet.deleteRow(range.getRow());
    }
  } catch (error) {
    // Log silently
  }
}

function updateSoldTotal(soldSheet, headers) {
  var priceIndex = headers.indexOf("PriceBin") + 1;
  var dataRange = soldSheet.getDataRange();
  var values = dataRange.getValues();
  var total = 0;

  for (var i = 1; i < values.length; i++) {
    var priceVal = parseFloat(values[i][priceIndex - 1]);
    if (!isNaN(priceVal)) {
      total += priceVal;
    }
  }

  // Write to a summary cell
  soldSheet.getRange(1, headers.length + 2).setValue("Total Sold:");
  soldSheet.getRange(2, headers.length + 2).setValue(total);
}

// --- CREATE A CUSTOM MENU IN SPREADSHEET ---
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('eBay Tools')
    .addItem('Update Selected Card Price', 'updateEbayPriceForActiveRow')
    .addToUi();
}

// --- MANUAL PRICE UPDATE FUNCTION ---
function updateEbayPriceForActiveRow() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var activeCell = sheet.getActiveCell();
  var row = activeCell.getRow();

  if (row === 1) {
    SpreadsheetApp.getUi().alert("Please select a row containing card data, not the header.");
    return;
  }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Gather column indices for different elements
  var nameIndex = headers.indexOf('Name') + 1;
  var setIndex = headers.indexOf('Set') + 1;
  var yearIndex = headers.indexOf('Year') + 1;
  var parallelIndex = headers.indexOf('Parallel') + 1;
  var serialIndex = headers.indexOf('Serial') + 1;
  var autoIndex = headers.indexOf('Auto') + 1;

  var priceIndex = headers.indexOf('AveragePrice') + 1;
  if (priceIndex === 0) {
    priceIndex = headers.length + 1;
    sheet.getRange(1, priceIndex).setValue('AveragePrice');
    headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  }

  var updatedIndex = headers.indexOf('LastUpdated') + 1;
  if (updatedIndex === 0) {
    updatedIndex = headers.length + 1;
    sheet.getRange(1, updatedIndex).setValue('LastUpdated');
    headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  }

  // Build query from combined columns
  var cardName = nameIndex > 0 ? sheet.getRange(row, nameIndex).getValue() : "";
  var cardSet = setIndex > 0 ? sheet.getRange(row, setIndex).getValue() : "";
  var cardYear = yearIndex > 0 ? sheet.getRange(row, yearIndex).getValue() : "";
  var cardParallel = parallelIndex > 0 ? sheet.getRange(row, parallelIndex).getValue() : "";
  var cardSerial = serialIndex > 0 ? sheet.getRange(row, serialIndex).getValue() : "";
  var cardAuto = autoIndex > 0 ? sheet.getRange(row, autoIndex).getValue() : "";

  var queryParts = [];
  if (cardYear) queryParts.push(cardYear);
  if (cardSet) queryParts.push(cardSet);
  if (cardName) queryParts.push(cardName);
  if (cardParallel) queryParts.push(cardParallel);

  // Convert boolean or strings to clean auto text
  if (cardAuto === true || cardAuto === "true" || cardAuto === "Yes" || cardAuto === "TRUE") {
    queryParts.push("Auto");
  }
  if (cardSerial) {
    queryParts.push(cardSerial);
  }

  var searchQuery = queryParts.join(" ");

  if (!cardName) {
    SpreadsheetApp.getUi().alert("No card name found in the selected row.");
    return;
  }

  var averagePrice = getAverageEbayPrice(searchQuery);

  if (averagePrice !== null) {
    sheet.getRange(row, priceIndex).setValue(averagePrice);
    sheet.getRange(row, updatedIndex).setValue(new Date());
    SpreadsheetApp.getUi().alert("Price updated successfully to $" + averagePrice);
  } else {
    sheet.getRange(row, priceIndex).setValue("No listings found");
  }
}

// --- FETCH 5 MOST RECENT BUY IT NOW LISTINGS ---
function getAverageEbayPrice(searchQuery) {
  try {
    var token = getEbayAccessToken();
    var encodedQuery = encodeURIComponent(searchQuery);
    var url = "https://api.ebay.com/buy/browse/v1/item_summary/search?q=" + encodedQuery + "&limit=5&sort=newlyListed";

    var response = UrlFetchApp.fetch(url, {
      "method": "get",
      "headers": {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      }
    });

    var data = JSON.parse(response.getContentText());

    if (data.itemSummaries && data.itemSummaries.length > 0) {
      var sum = 0;
      var count = 0;

      for (var i = 0; i < data.itemSummaries.length; i++) {
        var priceStr = data.itemSummaries[i].price.value;
        var price = parseFloat(priceStr);
        if (!isNaN(price)) {
          sum += price;
          count++;
        }
      }
      return count > 0 ? (sum / count).toFixed(2) : null;
    }
    return null;
  } catch (e) {
    Logger.log("Error retrieving pricing for " + searchQuery + ": " + e);
    return null;
  }
}

// --- OAUTH 2.0 TOKEN GENERATOR ---
function getEbayAccessToken() {
  var scriptProperties = PropertiesService.getScriptProperties();
  var clientId = scriptProperties.getProperty('EBAY_CLIENT_ID');
  var clientSecret = scriptProperties.getProperty('EBAY_CLIENT_SECRET');

  var url = "https://api.ebay.com/identity/v1/oauth2/token";
  var credentials = Utilities.base64Encode(clientId + ":" + clientSecret);

  var response = UrlFetchApp.fetch(url, {
    "method": "post",
    "headers": {
      "Authorization": "Basic " + credentials,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    "payload": {
      "grant_type": "client_credentials",
      "scope": "https://api.ebay.com/oauth/api_scope"
    }
  });

  var result = JSON.parse(response.getContentText());
  return result.access_token;
}

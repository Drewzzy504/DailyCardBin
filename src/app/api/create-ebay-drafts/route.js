import { NextResponse } from 'next/server';

// Helper function to get a User Access Token using a Refresh Token
async function getEbayUserToken() {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  const refreshToken = process.env.EBAY_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('eBay credentials or refresh token are missing in environment variables.');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', refreshToken);
  params.append('scope', 'https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.inventory');

  const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh eBay token: ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const cards = body.cards;

    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      return NextResponse.json({ error: 'No cards provided' }, { status: 400 });
    }

    const userToken = await getEbayUserToken();

    // Environment configurations required by eBay
    const merchantLocationKey = process.env.EBAY_MERCHANT_LOCATION_KEY || 'default';
    const categoryId = process.env.EBAY_CATEGORY_ID || '213'; // 213 is Sports Trading Cards
    const fulfillmentPolicyId = process.env.EBAY_FULFILLMENT_POLICY_ID;
    const paymentPolicyId = process.env.EBAY_PAYMENT_POLICY_ID;
    const returnPolicyId = process.env.EBAY_RETURN_POLICY_ID;

    if (!fulfillmentPolicyId || !paymentPolicyId || !returnPolicyId) {
      throw new Error('eBay Policy IDs are missing in environment variables.');
    }

    const results = [];

    for (const card of cards) {
      const sku = `DCB-${card.ID}-${Date.now()}`; // Ensure unique SKU

      // 1. CREATE INVENTORY ITEM
      const itemTitle = `${card.Year} ${card.Set} ${card.Name} ${card.Parallel} ${card.CardNumber ? '#' + card.CardNumber : ''}`.replace(/\s+/g, ' ').trim().substring(0, 80);

      const imageUrls = [];
      if (card.ImageURL) imageUrls.push(card.ImageURL);
      if (card.ImageURLBack) imageUrls.push(card.ImageURLBack);

      const aspects = {
        "Sport": [card.Category || "Other"],
        "Player/Athlete": [card.Name],
        "Manufacturer": [card.Manufacturer || "Unknown"],
        "Set": [card.Set],
        "Season": [card.Year],
        "Features": []
      };

      if (card.CardNumber) aspects["Card Number"] = [card.CardNumber];
      if (card.Parallel) aspects["Parallel/Variety"] = [card.Parallel];
      if (card.Auto) aspects["Features"].push("Autograph");
      if (card.Serial) aspects["Features"].push("Serial Numbered");

      if (aspects["Features"].length === 0) delete aspects["Features"];

      const inventoryItemPayload = {
        product: {
          title: itemTitle,
          aspects: aspects,
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        },
        condition: card.ConditionValue ? card.ConditionValue.toString() : "400010",
        conditionDescription: `Condition evaluated as ${card.CardCondition || 'NM'}. Please see photos for exact condition.`,
        availability: {
          shipToLocationAvailability: {
            quantity: 1,
          }
        }
      };

      const itemRes = await fetch(`https://api.ebay.com/sell/inventory/v1/inventory_item/${sku}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
          'Content-Language': 'en-US'
        },
        body: JSON.stringify(inventoryItemPayload)
      });

      if (!itemRes.ok) {
        const errorText = await itemRes.text();
        results.push({ success: false, cardId: card.ID, title: itemTitle, error: `Failed to create item: ${errorText}` });
        continue;
      }

      // 2. CREATE OFFER (DRAFT)
      const offerPayload = {
        sku: sku,
        marketplaceId: "EBAY_US",
        format: "FIXED_PRICE",
        listingDescription: `<p>You are purchasing the card titled: <strong>${itemTitle}</strong>.</p><p>Condition: ${card.CardCondition || 'NM'}. See photos.</p>`,
        availableQuantity: 1,
        categoryId: categoryId,
        pricingSummary: {
          price: {
            value: "0.99", // Placeholder, you will edit this in the draft
            currency: "USD"
          }
        },
        listingPolicies: {
          fulfillmentPolicyId: fulfillmentPolicyId,
          paymentPolicyId: paymentPolicyId,
          returnPolicyId: returnPolicyId
        },
        merchantLocationKey: merchantLocationKey
      };

      const offerRes = await fetch('https://api.ebay.com/sell/inventory/v1/offer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
          'Content-Language': 'en-US'
        },
        body: JSON.stringify(offerPayload)
      });

      if (!offerRes.ok) {
        const errorText = await offerRes.text();
        results.push({ success: false, cardId: card.ID, title: itemTitle, error: `Failed to create offer: ${errorText}` });
      } else {
        const offerData = await offerRes.json();
        results.push({ success: true, cardId: card.ID, title: itemTitle, offerId: offerData.offerId });
      }
    }

    const allSuccessful = results.every(r => r.success);
    return NextResponse.json({
      success: allSuccessful,
      results: results
    });

  } catch (error) {
    console.error("eBay Draft Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // URL provided by the user via Apps Script
    const appsScriptUrl = process.env.APPS_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbwfY2tGS6MxYoUEqvGhJ657T0O532CW0bCeHQPujRIUcj3DRfbtees_wzqMuT6K8v7d/exec";

    if (!appsScriptUrl) {
      console.warn('APPS_SCRIPT_URL is not configured. Returning mock inventory only.');
      return NextResponse.json({ inventory: getMockInventory() });
    }

    const response = await fetch(appsScriptUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Ensure we don't aggressively cache the inventory
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unable to read error body');
      throw new Error(`Failed to fetch from Apps Script: ${response.status} ${response.statusText} ${errText}`.trim());
    }

    const data = await response.json();
    
    // The Apps Script seems to return {"inventory": []}
    const inventory = data.inventory || [];

    if (inventory.length === 0) {
      console.log('Sheet is empty or returned no inventory. Falling back to mock data for testing UI.');
      return NextResponse.json({ inventory: getMockInventory() });
    }

    // Filter items based on criteria (just in case the Apps Script didn't already filter them)
    const availableInventory = inventory.filter((item) => {
      const isApproved = String(item.Approved).trim().toUpperCase() === 'TRUE';
      const isSold = String(item.Sold).trim().toUpperCase() === 'TRUE';
      return isApproved && !isSold;
    });

    const normalizedInventory = availableInventory.map((item) => ({
      ...item,
      Category: String(item.Category ?? item.category ?? item.Sport ?? item.sport ?? 'Other').trim(),
    }));

    return NextResponse.json({ inventory: normalizedInventory });

  } catch (error) {
    console.error('Error fetching inventory from Google Apps Script:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch inventory data' },
      { status: 500 }
    );
  }
}

function getMockInventory() {
  return [
    { ID: '1', Name: 'LeBron James Rookie Card', Set: 'Topps Chrome', Year: '2003', Category: 'Basketball', PriceBin: '5', ImageURL: '', Approved: 'TRUE', Sold: 'FALSE' },
    { ID: '2', Name: 'Shohei Ohtani Auto', Set: 'Bowman', Year: '2018', Category: 'Baseball', PriceBin: '3', ImageURL: '', Approved: 'TRUE', Sold: 'FALSE' },
    { ID: '3', Name: 'Tom Brady Base', Set: 'Panini Prizm', Year: '2020', Category: 'Football', PriceBin: '1', ImageURL: '', Approved: 'TRUE', Sold: 'FALSE' },
    { ID: '4', Name: 'Michael Jordan Holo', Set: 'Upper Deck', Year: '1996', Category: 'Basketball', PriceBin: '5', ImageURL: '', Approved: 'TRUE', Sold: 'FALSE' },
    { ID: '5', Name: 'Ken Griffey Jr.', Set: 'Upper Deck', Year: '1989', Category: 'Baseball', PriceBin: '1', ImageURL: '', Approved: 'TRUE', Sold: 'FALSE' },
    { ID: '6', Name: 'Patrick Mahomes', Set: 'Donruss Optic', Year: '2017', Category: 'Football', PriceBin: '1', ImageURL: '', Approved: 'TRUE', Sold: 'FALSE' },
    { ID: '7', Name: 'Lionel Messi Base', Set: 'Panini', Year: '2014', Category: 'Soccer', PriceBin: '1', ImageURL: '', Approved: 'TRUE', Sold: 'FALSE' },
    { ID: '8', Name: 'Stephen Curry Auto', Set: 'National Treasures', Year: '2009', Category: 'Basketball', PriceBin: '5', ImageURL: '', Approved: 'TRUE', Sold: 'FALSE' },
    { ID: '9', Name: 'Mike Trout Chrome', Set: 'Bowman Draft', Year: '2009', Category: 'Baseball', PriceBin: '3', ImageURL: '', Approved: 'TRUE', Sold: 'FALSE' },
    { ID: '10', Name: 'Kobe Bryant Refractor', Set: 'Topps Chrome', Year: '1996', Category: 'Basketball', PriceBin: '1', ImageURL: '', Approved: 'TRUE', Sold: 'FALSE' },
  ];
}

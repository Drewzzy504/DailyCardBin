import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image');

    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // 1. Get the ArrayBuffer and convert to Base64 for ImgBB and Gemini
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    const mimeType = imageFile.type || 'image/jpeg';

    // 2. Upload to ImgBB
    let imageUrl = '';
    const imgbbKey = process.env.IMGBB_API_KEY;
    if (!imgbbKey) {
      throw new Error('IMGBB_API_KEY is not configured in .env.local');
    }

    // ImgBB requires URL-encoded form data with the base64 string
    const imgbbParams = new URLSearchParams();
    imgbbParams.append('key', imgbbKey);
    imgbbParams.append('image', base64Image);

    const imgbbResponse = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: imgbbParams,
    });

    const imgbbData = await imgbbResponse.json();
    if (imgbbData.success) {
      imageUrl = imgbbData.data.url;
    } else {
      throw new Error('Failed to upload image to ImgBB: ' + JSON.stringify(imgbbData));
    }

    // 3. Analyze with Gemini
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      throw new Error('GEMINI_API_KEY is not configured in .env.local');
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    let model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are an expert sports card grader and appraiser. 
      Look closely at the provided image of a sports card.
      Extract the following information:
      1. Name: The full name of the player.
      2. Set: The brand and set name (e.g., "Topps Chrome", "Panini Prizm").
      3. Year: The year of the card (e.g., "2003", "1989"). If you only see a season like "19-20", write "2019".
      
      Respond ONLY with a valid, raw JSON object exactly like this:
      {
        "Name": "Player Name",
        "Set": "Brand Set",
        "Year": "YYYY"
      }
      Do not include markdown formatting (like \`\`\`json) or any other text. Just the raw JSON object.
    `;

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType
      },
    };

    let responseText = "";
    
    try {
      const result = await model.generateContent([prompt, imagePart]);
      responseText = result.response.text();
    } catch (e) {
      console.warn("gemini-1.5-flash failed, falling back to gemini-pro-vision", e.message);
      // Fallback for older API keys or regional restrictions
      model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
      const result = await model.generateContent([prompt, imagePart]);
      responseText = result.response.text();
    }
    
    // Clean up the response in case Gemini wrapped it in markdown anyway
    let cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let cardData = {
      Name: "Unknown",
      Set: "Unknown",
      Year: "Unknown"
    };

    try {
      cardData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Failed to parse Gemini output as JSON:", cleanedText);
      // We will fallback to the default Unknown values if parsing fails
    }

    // Return the combined data
    return NextResponse.json({
      success: true,
      data: {
        Name: cardData.Name || "Unknown",
        Set: cardData.Set || "Unknown",
        Year: cardData.Year || "Unknown",
        ImageURL: imageUrl
      }
    });

  } catch (error) {
    console.error('Scan Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

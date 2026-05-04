import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Helper function to upload to ImgBB
async function uploadToImgBB(base64Image) {
  const imgbbKey = process.env.IMGBB_API_KEY;
  if (!imgbbKey) throw new Error('IMGBB_API_KEY is not configured in .env.local');

  const imgbbParams = new URLSearchParams();
  imgbbParams.append('key', imgbbKey);
  imgbbParams.append('image', base64Image);

  const imgbbResponse = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: imgbbParams,
  });

  const imgbbData = await imgbbResponse.json();
  if (imgbbData.success) {
    return imgbbData.data.url;
  } else {
    throw new Error('Failed to upload image to ImgBB');
  }
}

// Helper to convert File to base64
async function getBase64(file) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image'); // Front
    const imageBackFile = formData.get('imageBack'); // Back (Optional)

    if (!imageFile) {
      return NextResponse.json({ error: 'No front image provided' }, { status: 400 });
    }

    // 1. Convert to Base64
    const base64Front = await getBase64(imageFile);
    const mimeTypeFront = imageFile.type || 'image/jpeg';
    
    let base64Back = null;
    let mimeTypeBack = null;
    if (imageBackFile) {
      base64Back = await getBase64(imageBackFile);
      mimeTypeBack = imageBackFile.type || 'image/jpeg';
    }

    // 2. Upload to ImgBB (run concurrently if both exist)
    const uploadPromises = [uploadToImgBB(base64Front)];
    if (base64Back) uploadPromises.push(uploadToImgBB(base64Back));
    
    const urls = await Promise.all(uploadPromises);
    const imageUrlFront = urls[0];
    const imageUrlBack = urls[1] || "";

    // 3. Analyze with Gemini
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) throw new Error('GEMINI_API_KEY is not configured in .env.local');

    const genAI = new GoogleGenerativeAI(geminiKey);
    let model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are an expert sports card grader and appraiser. 
      Look closely at the provided image(s) of a sports card. If there are two images, the first is the front and the second is the back.
      Use the text on the back of the card (if provided) to help accurately identify the Year and Set.
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

    const imageParts = [
      { inlineData: { data: base64Front, mimeType: mimeTypeFront } }
    ];
    
    if (base64Back) {
      imageParts.push({ inlineData: { data: base64Back, mimeType: mimeTypeBack } });
    }

    let responseText = "";
    
    try {
      const result = await model.generateContent([prompt, ...imageParts]);
      responseText = result.response.text();
    } catch (e) {
      console.warn("gemini-1.5-flash failed, falling back to gemini-pro-vision", e.message);
      model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
      const result = await model.generateContent([prompt, ...imageParts]);
      responseText = result.response.text();
    }
    
    // Clean up the response
    let cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let cardData = { Name: "Unknown", Set: "Unknown", Year: "Unknown" };

    try {
      cardData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Failed to parse Gemini output as JSON:", cleanedText);
    }

    // Return the combined data
    return NextResponse.json({
      success: true,
      data: {
        Name: cardData.Name || "Unknown",
        Set: cardData.Set || "Unknown",
        Year: cardData.Year || "Unknown",
        ImageURL: imageUrlFront,
        ImageURLBack: imageUrlBack
      }
    });

  } catch (error) {
    console.error('Scan Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

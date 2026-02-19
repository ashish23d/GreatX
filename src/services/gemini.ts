import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const chatModel = "gemini-3-flash-preview";
export const imageModel = "gemini-2.5-flash-image";

export async function generateChatResponse(prompt: string, history: { role: string, parts: { text: string }[] }[]) {
  const response = await ai.models.generateContent({
    model: chatModel,
    contents: [
        ...history,
        { role: 'user', parts: [{ text: prompt }] }
    ],
    config: {
      systemInstruction: "You are GreatX AI, a helpful and intelligent AI assistant. You can speak many languages. If the user asks for an image and you cannot generate it (because the request wasn't caught by the image generator), politely ask them to start their request with 'Generate an image of...' or 'Draw...'. Do not attempt to describe the image in text as if you generated it.",
    }
  });
  return response.text;
}

export async function generateImage(prompt: string) {
  const response = await ai.models.generateContent({
    model: imageModel,
    contents: {
      parts: [{ text: prompt }]
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}

export async function editImage(base64Image: string, prompt: string) {
    const mimeType = base64Image.split(';')[0].split(':')[1];
    const data = base64Image.split(',')[1];

    const response = await ai.models.generateContent({
        model: imageModel,
        contents: {
            parts: [
                {
                    inlineData: {
                        data,
                        mimeType
                    }
                },
                {
                    text: prompt
                }
            ]
        }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    return null;
}

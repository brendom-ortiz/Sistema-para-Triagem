
import { GoogleGenAI, Type } from "@google/genai";
import { DocumentType } from "../types";

// Use GEMINI_API_KEY as per guidelines and handle potential process undefined error
const apiKey = typeof process !== 'undefined' ? (process.env.GEMINI_API_KEY || process.env.API_KEY) : '';
const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export const classifyDocument = async (base64Image: string): Promise<{ type: DocumentType, confidence: number }> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            },
            {
              text: "Analise esta imagem de documento e identifique se é um RG/CNH, Comprovante de Residência, Comprovante de Renda, Contrato de Consórcio ou um E-mail de Solicitação (print de tela ou PDF). Retorne o resultado em JSON."
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            classification: {
              type: Type.STRING,
              description: "O tipo do documento: 'ID', 'RESIDENCE', 'INCOME', 'CONTRACT', 'REQUEST_EMAIL' ou 'UNKNOWN'"
            },
            confidence: {
              type: Type.NUMBER,
              description: "Nível de confiança de 0 a 1"
            }
          },
          required: ["classification", "confidence"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    
    const typeMap: Record<string, DocumentType> = {
      'ID': DocumentType.ID,
      'RESIDENCE': DocumentType.RESIDENCE,
      'INCOME': DocumentType.INCOME,
      'CONTRACT': DocumentType.CONTRACT,
      'REQUEST_EMAIL': DocumentType.REQUEST_EMAIL,
      'UNKNOWN': DocumentType.UNKNOWN
    };

    return {
      type: typeMap[result.classification] || DocumentType.UNKNOWN,
      confidence: result.confidence || 0
    };
  } catch (error) {
    console.error("Erro ao classificar documento:", error);
    return { type: DocumentType.UNKNOWN, confidence: 0 };
  }
};

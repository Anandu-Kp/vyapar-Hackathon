import { fetch, Headers, Request, Response } from 'undici';
import axios from 'axios';

// Polyfill global fetch APIs for browser-like compatibility
globalThis.fetch = fetch;
globalThis.Headers = Headers;
globalThis.Request = Request;
globalThis.Response = Response;

import fs from "fs";
import { MODEL_API, MODEL_API_KEY, MODEL_NAME } from '../config/env-configs.js';
import { AzureKeyCredential } from '@azure/core-auth';
import ModelClient from '@azure-rest/ai-inference';
import { getPrompt } from '../generate-docs/service.js';
import { PROMPT_TYPE } from './enums.js';

const modelEndpoint = "http://192.168.138.229:8000";

export const cleanTextFile = (inputPath) => {
    try {
        // Step 1: Read the input file
        const raw = fs.readFileSync(inputPath, "utf8");

        // Step 2: Clean and normalize the text content
        const cleanedDoc = raw
            // Convert Windows line endings to Unix style
            .replace(/\r\n/g, "\n")
            
            // Remove any non-printable characters except newlines
            // \x20-\x7E represents printable ASCII characters
            .replace(/[^\x20-\x7E\n]/g, "")
            
            // Replace multiple consecutive newlines with just two
            .replace(/\n{2,}/g, "\n\n")
            
            // Remove any leading or trailing whitespace
            .trim();

        return cleanedDoc;
    } catch (error) {
        console.error("Error in cleanTextFile:", error.message);
        throw new Error(`Failed to clean text file: ${error.message}`);
    }
}

export const getDocumentId = async (text) => {
    const url = `${modelEndpoint}/retrieve`;
    const headers = {
        'Content-Type': 'application/json'
    };
    const data = {
        document: text
    };
    const response = (await axios.post(url, data, { headers }))?.data?.match;
    if(response && response.distance && response.distance >= 0 && response.distance < 0.5) {
        return response;
    }
    return {};
}

export const updateDocumentId = async (docId, text) => {
    const url = `${modelEndpoint}/store`;
    const headers = {
        'Content-Type': 'application/json'
    };
    const data = {
        document_id: docId,
        document: text
    };
    const response = await axios.post(url, data, { headers });
    return response;
}

export const refactorPrompt = (prompt, variables = []) => {
    try {
        // Step 1: Initialize the updated prompt with the template
        let updatedPrompt = prompt;

        // Step 2: Replace each variable in the prompt
        variables.forEach(variable => {
            // Only process if both key and value are provided
            if (variable.key && variable.value) {
                // Replace {key} with the corresponding value
                if( typeof variable.value === 'object' ) {
                    variable.value = JSON.stringify(variable.value);
                }
                updatedPrompt = updatedPrompt.replace(
                    `${variable.key}`, 
                    String(variable.value) // Ensure value is converted to string
                );
            }
        });

        return updatedPrompt;
    } catch (error) {
        // Step 3: Error handling
        console.error("Error in refactorPrompt:", error.message);
        throw new Error(`Failed to refactor prompt: ${error.message}`);
    }
}
// TODO: To be changeds
export const getDocumentData = async (prdData, retry = 0) => {
    const url = `${modelEndpoint}/extract-page-details`;
    const headers = {
        'Content-Type': 'application/json'
    };
    const data = {  
        prd_text: prdData
    };
    const response = await axios.post(url, data, { headers });
    if(response?.data?.error && retry < 3) {
        // retry
        return getDocumentData(prdData, retry + 1);
    }
    return response?.data || {};
}

export const updateDocumentInVectorDb = async (docId, text) => {
    
    const url = `${modelEndpoint}/update`;
    const headers = {
        'Content-Type': 'application/json'
    };
    const data = {
        document_id: docId,
        document: text
    };
    const response = await axios.post(url, data, { headers });
    return response;
}

export const getCombinedPrdData = async (prdData1, prdData2) => {
    const endpoint = MODEL_API;
    const modelName = MODEL_NAME;

    const client = new ModelClient(endpoint, new AzureKeyCredential(MODEL_API_KEY));
    const promptType = PROMPT_TYPE.COMBINE_PROMPT;

    const prompt = await getPrompt(promptType);

    const prdArray = [
        { key: "<prd1>", value: 'PRD 1: '+prdData1 },
    ];
    if(prdData2) {
        prdArray.push({ key: "<prd2>", value: 'PRD 2: '+prdData2 });
    } else {
        prdArray.push({ key: "<prd2>", value: '' });
    }

    const updatedPrompt = refactorPrompt(prompt, prdArray);

    const response = await client.path("/chat/completions").post({
        body: {
            messages: [
                { role: "system", content: "Do not respond with intermediate placeholders like <thinking>. Only return the final answer" },
                { role: "user", content: updatedPrompt }
            ],
            max_tokens: 2048,
            model: modelName
        }
    });
    // TODO: To be validated
    return response.body?.choices?.[0]?.message?.content;
}

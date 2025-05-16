import { fetch, Headers, Request, Response } from 'undici';

// Polyfill global fetch APIs for browser-like compatibility
globalThis.fetch = fetch;
globalThis.Headers = Headers;
globalThis.Request = Request;
globalThis.Response = Response;

import fs from "fs";
import { pipeline } from '@xenova/transformers';

const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

export const cleanTextFile = (inputPath, outputPath) => {
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


export const getEmbedding = async (text) => {
    try {
        // Step 1: Generate embedding using the MiniLM model
        // The model processes the text and returns a tensor of embeddings
        const output = await extractor(text);

        // Step 2: Extract the embedding vector
        // The model returns data in a specific format, we need the first vector
        // This is a 384-dimensional vector that represents the text's meaning
        const embedding = output.data[0];

        // Step 3: Validate the embedding
        if (!embedding || embedding.length !== 384) {
            throw new Error("Invalid embedding generated: incorrect dimensions");
        }

        return embedding;
    } catch (error) {
        // Step 4: Error handling
        console.error("Error in getEmbedding:", error.message);
        throw new Error(`Failed to generate embedding: ${error.message}`);
    }
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
                updatedPrompt = updatedPrompt.replace(
                    `{${variable.key}}`, 
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

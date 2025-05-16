import { PROMPT_TYPE } from "../common/enums.js";
import { MODEL_API, MODEL_API_KEY } from "../config/env-configs.js";
import axios from "axios";

/**
 * Main service function to process documentation generation
 * This function handles the entire flow from PRD processing to document generation
 * @param {Object} data - Input data containing PRD and images
 * @param {string} data.prd - Path to the Product Requirements Document
 * @param {Array} data.images - Array of image paths or data
 * @returns {Promise<void>}
 */
export const processDocsService = async (data) => {
    const { prd, images } = data;

    // Step 1: Clean and preprocess the PRD text
    // Removes special characters, normalizes line endings, and prepares text for processing
    const prdData = cleanTextFile(prd, "prd.txt");

    // Step 2: Generate vector embedding for the PRD
    // Converts the text into a numerical vector representation for semantic search
    const prdVector = await getEmbedding(prdData);

    // Step 3: Find similar existing documents
    // Searches the database for documents with similar content using vector similarity
    const matchingPageData = await getMatchingpages(prdVector) || [];

    // Step 4: Determine prompt type based on whether similar documents exist
    // If similar documents exist, use update prompt; otherwise, use create prompt
    const promptType = matchingPageData?.length > 0 ? PROMPT_TYPE.UPDATE_PROMPT : PROMPT_TYPE.CREATE_PROMPT;
    
    // Step 5: Retrieve the appropriate prompt template from the database
    const prompt = await getPrompt(promptType);

    // Step 6: Prepare the final prompt by injecting the required data
    // Combines the prompt template with PRD data, matching pages, and images
    const updatedPrompt = refactorPrompt(prompt, [
        { key: "prd", value: prdData },
        { key: "matchingPageData", value: matchingPageData.data },
        { key: "images", value: images }
    ]);

    // Step 7: Generate the final documentation using the AI model
    // Sends the prepared prompt to the AI model and gets the response
    const response = await generateDocs(updatedPrompt);
    console.log(response);
}

/**
 * Generates documentation using an AI model API
 * This function makes an API call to the AI model with the prepared prompt
 * @param {string} prompt - The prepared prompt containing all necessary information
 * @returns {Promise<Object>} The AI model's response containing the generated documentation
 * @throws {Error} If API configuration is missing or API call fails
 */
const generateDocs = async (prompt) => {
    // Step 1: Get API configuration
    const apiUrl = MODEL_API;
    const apiKey = MODEL_API_KEY;
    const model = MODEL_NAME;
    const maxTokens = MAX_TOKENS;

    // Step 2: Validate required configuration
    if (!apiUrl || !apiKey) {
        throw new Error("MODEL_API or MODEL_API_KEY is not set");
    }

    // Step 3: Prepare the API request payload
    const requestPayload = {
        messages: [{
            role: "user",
            content: prompt
        }],
        max_tokens: maxTokens,
        model: model,
    };

    // Step 4: Set up request headers
    const headers = {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
    };

    // Step 5: Make the API call and return the response
    try {
        const response = await axios.post(apiUrl, requestPayload, { headers });
        return response.data;
    } catch (error) {
        console.error("Error generating documentation:", error.message);
        throw new Error(`Failed to generate documentation: ${error.message}`);
    }
}

/**
 * Retrieves similar documents from the database using vector similarity search
 * This function uses MongoDB's vector search to find documents with similar content
 * to the provided PRD vector
 * 
 * @param {Array<number>} prdVector - The vector representation of the PRD document
 * @returns {Promise<Array>} Array of matching documents, sorted by similarity
 * @throws {Error} If database connection fails or search operation fails
 */
export const getMatchingpages = async (prdVector) => {
    try {
        // Step 1: Get database connection
        const db = await getDB();

        // Step 2: Perform vector similarity search
        // Uses MongoDB's $vectorSearch operator to find similar documents
        const pages = await db.collection("documents").aggregate([
            {
                $vectorSearch: {
                    queryVector: prdVector,    // The vector to compare against
                    path: "embedding",         // Field containing document vectors
                    numCandidates: 100,        // Number of candidates to consider
                    limit: 1,                  // Number of results to return
                    index: "default"           // Name of the vector search index
                }
            }
        ]).toArray();

        return pages;
    } catch (error) {
        // Step 3: Error handling
        console.error("Error in getMatchingpages:", error.message);
        throw new Error(`Failed to retrieve matching pages: ${error.message}`);
    }
}

/**
 * Retrieves a prompt template from the database based on the specified type
 * This function fetches either a CREATE_PROMPT or UPDATE_PROMPT template
 * that will be used to generate the documentation
 * 
 * @param {string} type - The type of prompt to retrieve (CREATE_PROMPT or UPDATE_PROMPT)
 * @returns {Promise<Object>} The prompt template object containing the template structure
 * @throws {Error} If database connection fails or prompt retrieval fails
 */
const getPrompt = async (type) => {
    try {
        // Step 1: Get database connection
        const db = await getDB();

        // Step 2: Retrieve the prompt template
        // Finds a single prompt document matching the specified type
        const prompt = await db.collection("prompts").findOne({ type });

        // Step 3: Validate prompt existence
        if (!prompt) {
            throw new Error(`No prompt template found for type: ${type}`);
        }

        return prompt;
    } catch (error) {
        // Step 4: Error handling
        console.error("Error in getPrompt:", error.message);
        throw new Error(`Failed to retrieve prompt template: ${error.message}`);
    }
}
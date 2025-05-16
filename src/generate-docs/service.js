import { PROMPT_TYPE } from "../common/enums.js";
import { MODEL_API, MODEL_API_KEY } from "../config/env-configs.js";
import ModelClient from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import { cleanTextFile, getEmbedding, refactorPrompt } from "../common/doc.js";

const endpoint = "https://ai-jeevaathecoder3428ai424715828480.services.ai.azure.com/models";
const modelName = "DeepSeek-R1";

/**
 * Main service function to process documentation generation
 * This function handles the entire flow from PRD processing to document generation
 * @param {Object} data - Input data containing PRD and images
 * @param {string} data.prd - Path to the Product Requirements Document
 * @param {Array} data.images - Array of image paths or data
 * @returns {Promise<void>}
 */
export const processDocsService = async (data) => {
    // const { prd, images } = data;

    const images = [
    {
        name:"reports-page",
        url:"https://drive.google.com/file/d/1OpggCQ8dobg1lxvrAbXYMztX91Few3U-/view?usp=sharing"
    },
    {
        name:"user-stage-report",
        url:"https://drive.google.com/file/d/18a3DPVTw8tFvtE_36vaWZHqD3XEz4Ppe/view?usp=sharing"
    },
    {
        name:"user-stage-report-column-modification",
        url:"https://drive.google.com/file/d/1jovpOEgtyMcYdc-3tmIWHCYwXUdBSKo9/view?usp=sharing"
    },
    {
        name:"user-stage-report-filter",
        url:"https://drive.google.com/file/d/1S6tOzvlDlC51d8zkC1Cc-GxHmxP1mb_D/view?usp=drive_link"
    },
];

    // Step 1: Clean and preprocess the PRD text
    // Removes special characters, normalizes line endings, and prepares text for processing
    const prdData = cleanTextFile("prd.txt", "unused.txt");

    // Step 2: Generate vector embedding for the PRD
    // Converts the text into a numerical vector representation for semantic search
    const prdVector = await getEmbedding(prdData);

    // Step 3: Find similar existing documents
    // Searches the database for documents with similar content using vector similarity
    // const matchingPageData = await getMatchingpages(prdVector) || [];

    // Step 4: Determine prompt type based on whether similar documents exist
    // If similar documents exist, use update prompt; otherwise, use create prompt
    // const promptType = matchingPageData?.length > 0 ? PROMPT_TYPE.UPDATE_PROMPT : PROMPT_TYPE.CREATE_PROMPT;
    
    // Step 5: Retrieve the appropriate prompt template from the database
    // const prompt = await getPrompt(promptType);

    // Step 6: Prepare the final prompt by injecting the required data
    // Combines the prompt template with PRD data, matching pages, and images
    
    const updatedPrompt = refactorPrompt(prompt, [
        { key: "prd", value: prdData },
        { key: "matchingPageData", value: matchingPageData.data },
        { key: "images", value: images }
    ]);

    // Step 7: Generate the final documentation using the AI model
    // Sends the prepared prompt to the AI model and gets the response
    // const response = await generateDocs(updatedPrompt);
    console.log(response);
}

/**
 * Generates documentation using an AI model API
 * This function makes an API call to the AI model with the prepared prompt
 * @param {string} prompt - The prepared prompt containing all necessary information
 * @returns {Promise<Object>} The AI model's response containing the generated documentation
 * @throws {Error} If API configuration is missing or API call fails
 */
const generateDocs = async (prdText) => {

  const endpoint = "https://ai-jeevaathecoder3428ai424715828480.services.ai.azure.com/models";
  const modelName = "DeepSeek-R1";

  const client = new ModelClient(endpoint, new AzureKeyCredential("DBEzpxw6g1IwCORzLYJceivmwpFWz4zEsXU6RXLyHkSRoeaaYIvzJQQJ99BEACHYHv6XJ3w3AAAAACOGFHaJ"));


  const response = await client.path("/chat/completions").post({
    body: {
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: prdText }
      ],
      max_tokens: 2048,
      model: modelName
    }
  });


  if (response.status !== "200") {
    throw response.body.error;
  }
console.log('First Response',response);
  console.log(response.body.choices[0].message.content);
};

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
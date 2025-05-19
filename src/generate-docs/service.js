import { PROMPT_TYPE, TEMP_PROMPTS } from "../common/enums.js";
import { API_VERSION, DEPLOYMENT, MODEL_API, MODEL_API_KEY, MODEL_NAME, } from "../config/env-configs.js";
import { cleanText, cleanTextFile, getCombinedPrdData, getDocumentData, getDocumentId, refactorPrompt, updateDocumentId, updateDocumentInVectorDb } from "../common/doc.js";
import { getDB } from "../config/mongo-config.js";
import { ObjectId } from "mongodb";
import { AzureOpenAI } from "openai";

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

    // const images = [
    //     {
    //         "name": "reports-page",
    //         "url": "https://drive.usercontent.google.com/download?id=1OpggCQ8dobg1lxvrAbXYMztX91Few3U-"
    //     },
    //     {
    //         "name": "user-stage-report",
    //         "url": "https://drive.usercontent.google.com/u/0/uc?id=18a3DPVTw8tFvtE_36vaWZHqD3XEz4Ppe"
    //     },
    //     {
    //         "name": "user-stage-report-column-modification",
    //         "url": "https://drive.usercontent.google.com/u/0/uc?id=1jovpOEgtyMcYdc-3tmIWHCYwXUdBSKo9"
    //     },
    //     {
    //         "name": "user-stage-report-filter",
    //         "url": "https://drive.usercontent.google.com/u/0/uc?id=1S6tOzvlDlC51d8zkC1Cc-GxHmxP1mb_D"
    //     },
    // ];

    //TODO: To be removed
    // const prdData = cleanTextFile("prd.txt");

    const prdData = cleanText(prd);

    let result = await getDocumentId(prdData);
    let docId = result?.document_id;

    let matchingPageData = [];

    if(docId) {
        matchingPageData = await getMatchingpages(docId) || [];
    }

    const promptType = matchingPageData?.length > 0 ? PROMPT_TYPE.UPDATE_PROMPT : PROMPT_TYPE.CREATE_PROMPT;

    const prompt = await getPrompt(promptType);


    const updatedPrompt = refactorPrompt(prompt, [
        { key: "<prd>", value: prdData },
        { key: "<htmlCode>", value: matchingPageData?.[0]?.htmlCode },
        { key: "<images>", value: images }
    ]);

    const response = await getTemplateFromAI(updatedPrompt);
    
    const cleanedHTMLResponse = await cleanHTMLResponse(response)

    docId = await storeHTMLTemplateInDb(cleanedHTMLResponse, prdData, docId);

    const combainedPrdData = await getCombinedPrdData(prdData, result?.document);

    await updateDocumentInVectorDb(docId, combainedPrdData);

    return true;
}

/**
 * Generates documentation using an AI model API
 * This function makes an API call to the AI model with the prepared prompt
 * @param {string} prompt - The prepared prompt containing all necessary information
 * @returns {Promise<Object>} The AI model's response containing the generated documentation
 * @throws {Error} If API configuration is missing or API call fails
 */
const getTemplateFromAI = async (prdText) => {

    const options = {endpoint: MODEL_API, apiKey: MODEL_API_KEY,deployment: DEPLOYMENT,apiVersion: API_VERSION}

    const client = new AzureOpenAI(options);


    const response = await client.chat.completions.create({
        messages: [
        { role:"system", content: "You are a helpful assistant." },
        { role:"user", content: prdText }
        ],
        max_completion_tokens: 15000,
        temperature: 1,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        model: MODEL_NAME
    });


    return response.choices?.[0]?.message?.content;
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
export const getMatchingpages = async (docId) => {
    try {
        const db = await getDB();
        const pages = await db.collection("pages").find({ _id: new ObjectId(docId) }).toArray();

        return pages;
    } catch (error) {
        // Step 4: Error handling
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
export const getPrompt = async (promptType) => {
    try {
        // Step 1: Get database connection
        const db = await getDB();

        // Step 2: Retrieve the prompt template
        // Finds a single prompt document matching the specified type
        const prompt = (await db.collection("configurations").findOne({ type: "PROMPT", prompt_type: promptType })) || {};
        
        prompt.template = TEMP_PROMPTS[promptType];

        // Step 3: Validate prompt existence
        if(!prompt?.template) {
            throw new Error(`No prompt template found for type: ${promptType}`);
        }

        return prompt.template;
    } catch (error) {
        // Step 4: Error handling
        console.error("Error in getPrompt:", error.message);
        throw new Error(`Failed to retrieve prompt template: ${error.message}`);
    }
}


export const cleanHTMLResponse = (response) => {
    const codeBlockMatch = response.match(/```html\n([\s\S]*?)```/);
    const cleanedResponse = codeBlockMatch ? codeBlockMatch[1] : response;
    return cleanedResponse;
}

export const storeHTMLTemplateInDb = async (cleanedHTMLResponse, prdData, docId = '') => {
    try {
        const db = await getDB();

        let documentData ={};
        let result = {};

        if(docId) {
            documentData.htmlCode = cleanedHTMLResponse;
            result = await db.collection("pages").updateOne(
                { _id: new ObjectId(docId) }, 
                { 
                    $set: documentData,
                    $setOnInsert: { created_at: new Date() } 
                },
                { upsert: true }  
            );
        }
        else {
            documentData = await getDocumentData(prdData);
            if(typeof documentData === 'string') {
                documentData = JSON.parse(documentData);
            }

            const existingRecord = await db.collection("pages").findOne({ pageTitle: documentData.pageTitle });
            if(existingRecord){
               documentData.pageTitle += `-${new Date().getTime()}`;
            }
            documentData.htmlCode = cleanedHTMLResponse;
            documentData.created_at = new Date();
            result = await db.collection("pages").insertOne(documentData);
        }

        return result?.insertedId || docId;
    } catch (error) {
        console.error("Error in storeHTMLTemplateInDb:", error.message);
        throw new Error(`Failed to store HTML template in database: ${error.message}`);
    }
}


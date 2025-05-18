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
    //         name: "reports-page",
    //         url: "https://drive.google.com/file/d/1OpggCQ8dobg1lxvrAbXYMztX91Few3U-/view?usp=sharing"
    //     },
    //     {
    //         name: "user-stage-report",
    //         url: "https://drive.google.com/file/d/18a3DPVTw8tFvtE_36vaWZHqD3XEz4Ppe/view?usp=sharing"
    //     },
    //     {
    //         name: "user-stage-report-column-modification",
    //         url: "https://drive.google.com/file/d/1jovpOEgtyMcYdc-3tmIWHCYwXUdBSKo9/view?usp=sharing"
    //     },
    //     {
    //         name: "user-stage-report-filter",
    //         url: "https://drive.google.com/file/d/1S6tOzvlDlC51d8zkC1Cc-GxHmxP1mb_D/view?usp=drive_link"
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

    // const response = await getTemplateFromAI(updatedPrompt);
    const cleanedHTMLResponse =`<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n    <meta charset=\"UTF-8\">\n    <title>New Feature Update: User Stage Report (v1.1)</title>\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n    <style>\n        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f9fafb; margin: 0; color: #222; }\n        .container { max-width: 760px; margin: 40px auto; padding: 32px; background: #fff; border-radius: 10px; box-shadow: 0 1px 8px rgba(0,0,0,0.07);}\n        h1 { font-size: 2rem; margin-bottom: 8px; }\n        h2 { font-size: 1.2rem; margin-top: 32px; color: #474747; }\n        ul { margin-left: 1.2em;}\n        li { margin-bottom: 8px;}\n        .img-block { margin: 24px 0; text-align: center;}\n        .img-block img { max-width: 100%; border-radius: 5px; border: 1px solid #eee;}\n        .img-block .caption { color: #5a5a5a; font-size: 0.96em; margin-top: 6px;}\n        @media (max-width: 660px) {\n          .container { padding: 14px; }\n        }\n        .update-tag { display: inline-block; background: #0c7dcd; color: #fff; padding: 2px 10px; border-radius: 6px; font-size: 0.97em;}\n    </style>\n</head>\n<body>\n<div class=\"container\">\n    <div class=\"update-tag\">New Feature</div>\n    <h1>User Stage Report <span style=\"color:#888; font-size:0.85em;\">(v1.1)</span></h1>\n    <p>\n        We're excited to introduce the <strong>User Stage Report</strong> – a new way for admins and managers to monitor lead stages and user performance across pipelines and campaigns, all in one place!\n    </p>\n\n    <div class=\"img-block\">\n        <img src=\"https://drive.google.com/uc?export=view&id=1OpggCQ8dobg1lxvrAbXYMztX91Few3U-\" alt=\"Reports Page View\" />\n        <div class=\"caption\">Access the new User Stage Report from the Reports section.</div>\n    </div>\n\n    <h2>✨ What's New?</h2>\n    <ul>\n        <li><strong>Stage-wise Lead Distribution:</strong> Instantly see how leads are distributed across various stages for each user.</li>\n        <li><strong>Flexible Filtering:</strong> Easily filter by date range, pipeline, campaign, and user – and filters remember your last selection on your browser.</li>\n        <li><strong>Interactive Table:</strong> Click on any lead count in the table to deep-dive into a detailed, filtered list.</li>\n        <li><strong>Download Capability:</strong> Quickly export your report for meetings or offline analysis.</li>\n        <li><strong>Real-time Data:</strong> All numbers reflect the latest updates, helping you keep a pulse on your team's progress.</li>\n    </ul>\n\n    <div class=\"img-block\">\n        <img src=\"https://drive.google.com/uc?export=view&id=18a3DPVTw8tFvtE_36vaWZHqD3XEz4Ppe\" alt=\"User Stage Report View\"/>\n        <div class=\"caption\">Get a clear view of user activities and lead stages with the new report.</div>\n    </div>\n\n    <h2>🔍 Key Benefits</h2>\n    <ul>\n        <li><strong>For Admins:</strong> Track your team's performance, identify bottlenecks, and get actionable insights—all in one view.</li>\n        <li><strong>For Managers:</strong> Monitor individual contributions and spot trends in how leads progress or get stuck.</li>\n        <li><strong>Filters That Work for You:</strong> Focus on just the data you need with simple filter controls.</li>\n    </ul>\n\n    <div class=\"img-block\">\n        <img src=\"https://drive.google.com/uc?export=view&id=1S6tOzvlDlC51d8zkC1Cc-GxHmxP1mb_D\" alt=\"User Stage Report Filters\" />\n        <div class=\"caption\">Filter your report by date range, pipeline, campaign, and user for tailored insights.</div>\n    </div>\n\n    <h2>🚀 How to Use the New User Stage Report</h2>\n    <ol>\n        <li>\n            <strong>Navigate to Reports:</strong> Open the Reports section and select <b>User Stage Report</b>.<br>\n        </li>\n        <li>\n            <strong>Apply Filters:</strong> Use the filters at the top to select your preferred date range, pipeline, campaigns, and users.<br>\n            <span style=\"color:#599;\">Tip: Filters are saved for you in your browser, so you don't have to set them every time.</span>\n        </li>\n        <li>\n            <strong>Understand at a Glance:</strong> The interactive table displays:\n            <ul>\n                <li>User names and their reporting managers</li>\n                <li>Conversion % – see how well leads are progressing</li>\n                <li>Stage-wise breakdown (e.g., Open, In Progress, Converted)</li>\n                <li>Total assigned leads per user</li>\n            </ul>\n        </li>\n        <li>\n            <strong>Drill Down:</strong> Click on any number (e.g., in Total Assigned Leads or specific lead stages) to view a detailed filtered list in a new tab.\n        </li>\n        <li>\n            <strong>Export:</strong> Click the download button to save your report for offline review or sharing.\n        </li>\n    </ol>\n\n    <div class=\"img-block\">\n        <img src=\"https://drive.google.com/uc?export=view&id=1jovpOEgtyMcYdc-3tmIWHCYwXUdBSKo9\" alt=\"Customized Columns and Sorting\"/>\n        <div class=\"caption\">Sort and customize your table – columns and filters adjust automatically based on your selections.</div>\n    </div>\n\n    <h2>📝 Example Scenario</h2>\n    <p>\n        Let's say a lead moves from <strong>"Open"</strong> to <strong>"In Progress"</strong> within a selected date range:\n    </p>\n    <ul>\n        <li>The <b>Open</b> stage count decreases by one.</li>\n        <li>The <b>In Progress</b> stage count increases by one.</li>\n        <li>All numbers reflect the most current stage of each lead at the moment you view the report.</li>\n    </ul>\n\n    <h2>💡 Need Help?</h2>\n    <p>\n        Have questions or feedback? Please reach out to your product support team! Check out the <a href=\"https://www.figma.com/design/XTXroSLxyLvgUIGOZTr5wJ/NeoDove-Product?node-id=7580-167771&t=695JjKp3n3EpZi09-1\" target=\"_blank\">detailed design mockups</a> for more visuals.\n    </p>\n</div>\n</body>\n</html>`
    // const cleanedHTMLResponse = await cleanHTMLResponse(response)

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


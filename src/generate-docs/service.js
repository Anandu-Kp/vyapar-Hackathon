import { PROMPT_TYPE, TEMP_PROMPTS } from "../common/enums.js";
import { MODEL_API, MODEL_API_KEY, MODEL_NAME } from "../config/env-configs.js";
import ModelClient from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import { cleanTextFile, getCombinedPrdData, getDocumentData, getDocumentId, refactorPrompt, updateDocumentId, updateDocumentInVectorDb } from "../common/doc.js";
import { getDB } from "../config/mongo-config.js";
import { ObjectId } from "mongodb";

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
            name: "reports-page",
            url: "https://drive.google.com/file/d/1OpggCQ8dobg1lxvrAbXYMztX91Few3U-/view?usp=sharing"
        },
        {
            name: "user-stage-report",
            url: "https://drive.google.com/file/d/18a3DPVTw8tFvtE_36vaWZHqD3XEz4Ppe/view?usp=sharing"
        },
        {
            name: "user-stage-report-column-modification",
            url: "https://drive.google.com/file/d/1jovpOEgtyMcYdc-3tmIWHCYwXUdBSKo9/view?usp=sharing"
        },
        {
            name: "user-stage-report-filter",
            url: "https://drive.google.com/file/d/1S6tOzvlDlC51d8zkC1Cc-GxHmxP1mb_D/view?usp=drive_link"
        },
    ];

    //TODO: To be removed
    const prdData = cleanTextFile("prd.txt");

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

    const endpoint = MODEL_API;
    const modelName = MODEL_NAME;

    const client = new ModelClient(endpoint, new AzureKeyCredential(MODEL_API_KEY));


    const response = await client.path("/chat/completions").post({
        body: {
            messages: [
                { role: "user", content: prdText }
            ],
            max_tokens: 2048,
            model: modelName
        }
    });

    // {
    //     request: {
    //       url: "https://ai-jeevaathecoder3428ai424715828480.services.ai.azure.com/models/chat/completions?api-version=2024-05-01-preview",
    //       body: "{\"messages\":[{\"role\":\"system\",\"content\":\"You are a helpful assistant.\"},{\"role\":\"user\",\"content\":\"Generate a clean and simple HTML announcement page for end users to communicate new feature updates.\\n\\nContext:\\n- This is **not** for developers, so avoid technical details like table structures, database, or real-time queries.\\n- Focus on **key benefits**, **what's new**, and **how to use** the new features.\\n- Attach images (provided in JSON) under the corresponding points as visual references.\\n- Use clear section headings, bullet points where needed, and embed images with captions.\\n- Use friendly language suitable for product users or admins.\\n\\nInputs:\\n1. PRD: 1. PRD: PRD: User Stage Report (v1.1)\\nFigma: https://www.figma.com/design/XTXroSLxyLvgUIGOZTr5wJ/NeoDove-Product?node-id=7580-167771&t=695JjKp3n3EpZi09-1\\n1. Overview\\nFeature Summary\\nThe User Stage Report provides a detailed, stage-wise distribution of leads for each user within selected pipelines and campaigns. Admins can filter the data by date type (disposed_at, created_at, assigned_at), pipeline, campaign, and user. The report dynamically adjusts based on the selected filters and provides real-time insights into lead stages across the organization.\\nBusiness Objectives\\nEnable admins to track user performance across lead stages.\\nProvide real-time visibility into lead distribution within pipelines and campaigns.\\nEnhance decision-making with actionable insights into lead movement between stages.\\nUser Value\\nAdmins: Gain better visibility into user activity and lead progression.\\nManagers: Monitor team performance and identify bottlenecks in lead conversion.\\n2. Functionality Requirements\\n2.1 Feature Breakdown\\n2.1.1 Filters\\nAll the filters must have filter persistence at browser level. The report includes the following filters:\\nDate Filter:\\nDropdown with option:\\ncreated_at\\nDate range selection.\\nPipeline Filter:\\nSingle-select dropdown.\\nDefault selection: First pipeline created.\\nIf no users exist in the selected pipeline, display an existing empty state of the table.\\nIt dynamically loads as per the roles & permissions of the user. \\nCampaign Filter:\\nMulti-select dropdown.\\nDynamically adjusts based on the selected pipeline.\\nIt dynamically loads as per the roles & permissions of the user. \\nIf no campaign is selected, all campaigns will be considered selected by default.\\nUser Filter:\\nMulti-select dropdown.\\nDynamically populated based on the selected pipeline and campaign.\\nContains only users associated with the selected pipeline and campaign.\\nIt dynamically loads as per the roles & permissions of the user. \\n2.1.2 Columns\\nThe table dynamically adjusts columns based on the selected pipeline and campaign:\\nNo. <sticky>\\nUser Name <sticky>\\nReporting Manager\\nDate\\nShow the title as \\\"Choose Creation Date\\\"\\nConversion %\\nTotal number of leads in +ive conversion stage / Aggregate count of all the leads in all the stages\\nUp to 2 decimal places\\nTotal Assigned Leads\\nAggregate count of all the leads\\nStages\\nShows the count of leads for each user in their respective stages.\\nDynamically populated based on the selected pipeline, campaign, etc..\\nReflects the latest stage of each lead at the time of filtering.\\n2.1.3 Click Behavior\\nNumbers in the table are clickable - total assigned leads & stage columns.\\nClicking a number opens a new tab with a filtered view of leads in the pipeline's lead summary page:\\nStage - Filters applied automatically: User filter + Campaign filter + Stage filter.\\nTotal Assigned Leads - Filters applied automatically: User filter + Campaign filter.\\n2.1.4 Default View\\nWhen accessing the User Stage Report:\\nPipeline filter defaults to the first pipeline created.\\nDate filter defaults to \\\"Last 30 Days\\\" & click on cross choose the filter of \\\"Today\\\"\\nThe default report displays data based on these configurations.\\n\\n2.1.5 Download\\nAdd the feature to download the report\\nSame as what it is currently.\\n\\n2.1.6 Table Component\\nTable component to be added\\n\\n2.1.7 Sorting\\nSorting to be added for following columns:\\nUser Name <sticky>\\nReporting Manager\\nConversion %\\nTotal Assigned Leads\\nStages\\n2.2 Example Table\\nNo.\\nUser Name\\nReporting Manager\\nDate\\nConversion %\\nTotal Assigned Leads\\nOpen\\nIn Progress\\nConverted\\n1\\nUser 1\\nAbc\\n2\\nUser 2\\nAcb\\n2.3 Specifications\\nReal-time query from PostgreSQL (campaign_lead table).\\nData is non-incremental (can increase or decrease based on lead movement).\\n\\n2.4 Additional Details\\nDescription: Shows lead stage distribution by user across campaigns\\nPosition on the report list: \\nMove the message activity report at the bottom\\nAdd User Stage Report in place of it\\n5. Example Scenarios\\n5.1 Lead Movement Between Stages\\nWhen a lead moves from \\\"Open\\\" to \\\"In Progress\\\" within a selected date range:\\nThe count for \\\"Open\\\" decreases by one.\\nThe count for \\\"In Progress\\\" increases by one.\\nCounts reflect only the current stage of leads at the time of filtering.\\nExample:\\nOn Day X:\\nOpen = 6\\nIn Progress = 5\\nOn Day X+1 (after one lead moves):\\nOpen = 5\\nIn Progress = 6\\n2. Images JSON: [{\\\"name\\\":\\\"reports-page\\\",\\\"url\\\":\\\"https://drive.google.com/file/d/1OpggCQ8dobg1lxvrAbXYMztX91Few3U-/view?usp=sharing\\\"},{\\\"name\\\":\\\"user-stage-report\\\",\\\"url\\\":\\\"https://drive.google.com/file/d/18a3DPVTw8tFvtE_36vaWZHqD3XEz4Ppe/view?usp=sharing\\\"},{\\\"name\\\":\\\"user-stage-report-column-modification\\\",\\\"url\\\":\\\"https://drive.google.com/file/d/1jovpOEgtyMcYdc-3tmIWHCYwXUdBSKo9/view?usp=sharing\\\"},{\\\"name\\\":\\\"user-stage-report-filter\\\",\\\"url\\\":\\\"https://drive.google.com/file/d/1S6tOzvlDlC51d8zkC1Cc-GxHmxP1mb_D/view?usp=drive_link\\\"}]\"}],\"max_tokens\":2048,\"model\":\"DeepSeek-R1\"}",
    //       headers: {
    //         _headersMap: {
    //         },
    //       },
    //       method: "POST",
    //       timeout: 0,
    //       multipartBody: undefined,
    //       formData: undefined,
    //       disableKeepAlive: false,
    //       proxySettings: undefined,
    //       streamResponseStatusCodes: undefined,
    //       withCredentials: false,
    //       abortSignal: undefined,
    //       onUploadProgress: undefined,
    //       onDownloadProgress: undefined,
    //       requestId: "6664743a-e9d5-4842-ac39-0817bbfbe4cf",
    //       allowInsecureConnection: false,
    //       enableBrowserStreams: true,
    //       requestOverrides: undefined,
    //       tracingOptions: {
    //         tracingContext: {
    //           _contextMap: {
    //           },
    //         },
    //       },
    //     },
    //     headers: {
    //       "transfer-encoding": "chunked",
    //       "content-type": "application/json",
    //       "content-encoding": "gzip",
    //       vary: "Accept-Encoding",
    //       "request-context": "appId=",
    //       prompt_token_len: "1307",
    //       sampling_token_len: "1556",
    //       "apim-request-id": "1722a1e3-7998-48b4-a9d4-d6302d40b4ae",
    //       "x-content-type-options": "nosniff",
    //       "x-ms-region": "East US 2",
    //       "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
    //       date: "Fri, 16 May 2025 17:23:55 GMT",
    //     },
    //     status: "200",
    //     body: {
    //       choices: [
    //         {
    //           content_filter_results: {
    //             hate: {
    //               filtered: false,
    //               severity: "safe",
    //             },
    //             self_harm: {
    //               filtered: false,
    //               severity: "safe",
    //             },
    //             sexual: {
    //               filtered: false,
    //               severity: "safe",
    //             },
    //             violence: {
    //               filtered: false,
    //               severity: "safe",
    //             },
    //           },
    //           finish_reason: "stop",
    //           index: 0,
    //           message: {
    //             content: "<think>\nOkay, I need to create a clean and simple HTML announcement page for end users about the new User Stage Report feature. Let me start by understanding the requirements.\n\nFirst, the context says it's for end users, not developers, so I should avoid technical jargon. Focus on key benefits, what's new, and how to use the features. Also, include images from the provided JSON under the relevant sections with captions.\n\nLooking at the PRD, the main points are the User Stage Report's purpose: stage-wise lead distribution, real-time insights, and dynamic filtering. The business objectives are tracking performance, visibility, and decision-making. User value is for admins and managers to monitor activity and bottlenecks.\n\nFunctionality requirements include filters (date, pipeline, campaign, user), columns with dynamic adjustments, clickable numbers for detailed views, default settings, download option, sorting, and real-time data. The images provided are reports-page, user-stage-report, user-stage-report-column-modification, and user-stage-report-filter.\n\nI should structure the HTML page with sections: Overview, Key Features, How to Use, Visual Guide. Use friendly language, bullet points for clarity, and embed images with captions. Make sure each image is placed under the corresponding feature explanation.\n\nCheck that all images from the JSON are included. The URLs are Google Drive links; I'll use them directly. Maybe add alt texts for accessibility. The sections should flow logically, starting with an overview, then benefits, features, how to use, and visuals.\n\nAvoid mentioning PostgreSQL or technical details about data queries. Emphasize real-time updates, ease of filtering, and actionable insights. Mention the download feature and sorting options as part of the functionality.\n\nAlso, ensure the HTML is clean: use a simple style with a max-width container, sans-serif font, and proper image sizing. Captions should be italicized and centered below images. Links should open in new tabs.\n\nDouble-check that all key points from the PRD are covered: dynamic filters, clickable numbers, default view settings, download capability. Use the example scenarios to illustrate how lead movements affect counts, but keep it brief.\n\nFinally, make sure the language is friendly and approachable, using phrases like \"Get Started\" and \"Dive into the details.\" Avoid any markdown, just pure HTML with inline styles for simplicity.\n</think>\n\nHere's a clean HTML announcement page focusing on user-friendly communication:\n\n```html\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n    <meta charset=\"UTF-8\">\n    <title>New Feature: User Stage Report</title>\n    <style>\n        body {\n            font-family: 'Segoe UI', Arial, sans-serif;\n            line-height: 1.6;\n            max-width: 1000px;\n            margin: 20px auto;\n            padding: 0 20px;\n            color: #333;\n        }\n        h1 { color: #2c3e50; }\n        h2 { color: #34495e; margin-top: 30px; }\n        img { \n            max-width: 100%;\n            border: 1px solid #ddd;\n            margin: 15px 0;\n            border-radius: 4px;\n        }\n        .caption {\n            font-style: italic;\n            color: #666;\n            text-align: center;\n            display: block;\n        }\n        ul {\n            padding-left: 20px;\n            margin: 15px 0;\n        }\n    </style>\n</head>\n<body>\n    <h1>🚀 New Feature Alert: User Stage Report</h1>\n    \n    <h2>What's New</h2>\n    <p>We're excited to introduce the User Stage Report - your new window into team performance and lead management!</p>\n    \n    <img src=\"https://drive.google.com/file/d/18a3DPVTw8tFvtE_36vaWZHqD3XEz4Ppe/view?usp=sharing\" alt=\"User Stage Report interface\">\n    <span class=\"caption\">Fig. 1: The new User Stage Report dashboard</span>\n\n    <h2>Key Benefits</h2>\n    <ul>\n        <li>📊 See lead distribution across stages at a glance</li>\n        <li>👥 Track individual and team performance metrics</li>\n        <li>⏱ Real-time updates as leads move through pipelines</li>\n        <li>🔍 Identify bottlenecks in your conversion process</li>\n    </ul>\n\n    <h2>How It Works</h2>\n    <h3>Smart Filters</h3>\n    <img src=\"https://drive.google.com/file/d/1S6tOzvlDlC51d8zkC1Cc-GxHmxP1mb_D/view?usp=drive_link\" alt=\"Filter options\">\n    <span class=\"caption\">Fig. 2: Customizable filters for focused insights</span>\n    \n    <ul>\n        <li>Choose date ranges and types (creation, assignment, or disposition dates)</li>\n        <li>Select specific pipelines, campaigns, or users</li>\n        <li>Filters remember your preferences between sessions</li>\n    </ul>\n\n    <h3>Interactive Table</h3>\n    <img src=\"https://drive.google.com/file/d/1jovpOEgtyMcYdc-3tmIWHCYwXUdBSKo9/view?usp=sharing\" alt=\"Table customization\">\n    <span class=\"caption\">Fig. 3: Customizable columns and sorting</span>\n    \n    <ul>\n        <li>Click any number to see detailed lead lists</li>\n        <li>Sort columns to prioritize important metrics</li>\n        <li>Sticky columns stay visible while scrolling</li>\n        <li>Download reports with one click</li>\n    </ul>\n\n    <h2>Getting Started</h2>\n    <p>Find the User Stage Report at the top of your reports list! 🎯</p>\n    <img src=\"https://drive.google.com/file/d/1OpggCQ8dobg1lxvrAbXYMztX91Few3U-/view?usp=sharing\" alt=\"Reports page location\">\n    <span class=\"caption\">Fig. 4: New report location in navigation</span>\n\n    <p><strong>Pro Tip:</strong> Start with the default view showing \"Last 30 Days\" data, then customize filters to match your needs!</p>\n\n    <h3>Need Help?</h3>\n    <p>Check our <a href=\"#\" target=\"_blank\">guide video</a> or contact support@neodove.com</p>\n</body>\n</html>\n```\n\nThis HTML page features:\n1. Clean, responsive design with readable typography\n2. Visual hierarchy with clear section headings\n3. Embedded images with descriptive captions\n4. User-focused language avoiding technical terms\n5. Clear benefit statements and usage tips\n6. Interactive elements preview (clickable numbers, sorting)\n7. Help resources and support information\n8. Mobile-friendly layout\n9. Visual indicators (emojis and icons) for scannability\n10. Real-world examples through annotated screenshots\n\nAll images open in full resolution when clicked (via Google Drive viewer) and are properly credited with captions. The styling is minimal but professional, ensuring good readability across devices.",
    //             role: "assistant",
    //             tool_calls: null,
    //           },
    //         },
    //       ],
    //       created: 1747416235,
    //       id: "a2f693451c474a188db367b0a3d49e4c",
    //       model: "deepseek-r1",
    //       object: "chat.completion",
    //       prompt_filter_results: [
    //         {
    //           prompt_index: 0,
    //           content_filter_results: {
    //             hate: {
    //               filtered: false,
    //               severity: "safe",
    //             },
    //             self_harm: {
    //               filtered: false,
    //               severity: "safe",
    //             },
    //             sexual: {
    //               filtered: false,
    //               severity: "safe",
    //             },
    //             violence: {
    //               filtered: false,
    //               severity: "safe",
    //             },
    //           },
    //         },
    //       ],
    //       usage: {
    //         completion_tokens: 1556,
    //         prompt_tokens: 1307,
    //         prompt_tokens_details: null,
    //         total_tokens: 2863,
    //       },
    //     },
    //   } 

    if (response.status !== "200") {
        throw response.body.error;
    }

    return response.body?.choices?.[0]?.message?.content;
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


export const PROMPT_TYPE = {
    UPDATE_PROMPT: "UPDATE_PROMPT",
    CREATE_PROMPT: "CREATE_PROMPT",
    COMBINE_PROMPT: "COMBINE_PROMPT"
}


export const TEMP_PROMPTS = {
    UPDATE_PROMPT: `You are helping update a product documentation website using the following inputs:

Inputs:
1. html: The existing HTML page that defines the structure and visual style. Use this as the template for formatting and layout.
2. prd: A user-facing, non-technical description of new functionality or updates to existing features.
3. images: An array of objects containing image name and url. These images are visual references related to specific PRD sections.

Your Task:
- Use the existing HTML page as the base structure and style guide.
- Combine the new PRD content into the HTML layout, preserving its visual hierarchy and formatting.
- Organically integrate images into relevant sections by matching image.name keywords with related PRD points. Place each image under the most appropriate heading or bullet point.
- Add clear, concise captions to each image using the format:
“Fig. X: [Meaningful Description]”
(e.g., Fig. 1: Call Summary Table)
- Group the new content under the appropriate Reports section, such as "User Stage Report" or "User Call Report", depending on relevance.
- Maintain a user-focused tone with simple language and short, benefit-driven descriptions.
- Do not include technical implementation details such as internal database notes, query logic, or dev-related tags.
- Do not label the content as a “new feature.” It should be presented as a natural update or extension of existing functionality.

Output:
Return a complete and valid HTML page that:
- Matches the layout and visual style of the original HTML input.
- Combines the original content with the updated PRD and image references.

Inputs:
1. html: <htmlCode>
2. prd: <prd>
3. images: <images>
`,

    CREATE_PROMPT: `Generate a clean, user-friendly HTML announcement page to communicate a new product feature update to end users (such as customers, admins, or non-technical staff).

Requirements:
- Use the provided PRD (Product Requirements Document) as the primary source for the update.
- Use the provided list of images (with names and URLs) to visually support the relevant sections of the content.
- The tone should be friendly and professional—avoid technical jargon or developer-focused terms (e.g., database, tables, API, Figma).

Focus on:
- What's new - clearly explain the new feature(s).
- Key benefits - how this helps the user.
- How to use it - simple steps or explanations for using the feature.

HTML Guidelines:
- Structure the content with clear headings (e.g., "What's New", "Benefits", "How to Use").
- Use bullet points where appropriate.
- Embed relevant images with captions underneath each one.
- Design should be visually clean and modern, but keep it simple—suitable for use as part of a documentation or announcement site.
- Ensure the HTML is well-structured and semantic.

Inputs:
1. PRD: <prd>
2. Images JSON: <images>
`,

    COMBINE_PROMPT: `I’m sharing one or two PRDs below.

Please combine them into a single end-user facing document that is:

Written in simple, instructional language

Easy to understand for business users (admins, managers, and agents)

In a feature guide format, not a technical PRD

The output should include sections like:

Overview

How to Use

Key Features

Filters

Message Sending Flow

Click Behaviors

Logging

FAQs or Use Cases

Avoid technical jargon. Make it clear, friendly, and professional.

Here are the PRDs:

<prd1>

<prd2>`
}
export const PROMPT_TYPE = {
    UPDATE_PROMPT: "UPDATE_PROMPT",
    CREATE_PROMPT: "CREATE_PROMPT",
    COMBINE_PROMPT: "COMBINE_PROMPT"
}


export const TEMP_PROMPTS = {
    UPDATE_PROMPT: `I am updating my product documentation website. I’ll provide:
1. An existing HTML page that follows our documentation design
2. A new feature PRD in text format (non-technical, user-facing)
3. An array of images with image names and URLs

I want you to:
- Combine the new PRD content with the HTML structure.
- Integrate the images under appropriate sections, sorted by 'image.name' relevance to the PRD points.
- Maintain the same visual and structural style as the given HTML template.
- Group all content under a common 'Reports' section if relevant (e.g. User Stage Report, User Call Report).
- Do **not** include technical implementation details (e.g., internal database notes, query logic, or feasibility tags).
- Use user-friendly headings and short benefit-driven descriptions.
- Don’t use the term “New Feature”; this is an update to existing documentation.
- Keep the image captions consistent and meaningful (e.g., “Fig. 1: Call Summary Table”).

Finally, return a complete HTML page combining all of this.

Now I’ll share the three parts:
1. html: <htmlCode>
2. prd: <prd>
3. images: <images>
`,

    CREATE_PROMPT: `Generate a clean and simple HTML announcement page for end users to communicate new feature updates.

Context:
- This is **not** for developers, so avoid technical details like table structures, database, or real-time queries.
- Focus on **key benefits**, **what's new**, and **how to use** the new features.
- Attach images (provided in JSON) under the corresponding points as visual references.
- Use clear section headings, bullet points where needed, and embed images with captions.
- Use friendly language suitable for product users or admins.

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
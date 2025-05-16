import { processDocsService } from './service.js';

export const processDocsController = async (req, res) => {
    try {
        // Step 1: Validate request body
        // if (!req.body || !req.body.prd) {
        //     return res.status(400).json({
        //         success: false,
        //         message: "Missing required fields: PRD is required"
        //     });
        // }

        // Step 2: Process the documents using the service
        // const response = await processDocsService(req.body);
        const response = await processDocsService();

        // Step 3: Send success response
        return res.status(200).json({
            success: true,
            message: "Docs processed successfully",
            data: response.data
        });
    } catch (error) {
        // Step 4: Error handling
        console.error("Error in processDocsController:", error.message);
        
        // Determine appropriate status code based on error type
        const statusCode = error.statusCode || 500;
        
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
}
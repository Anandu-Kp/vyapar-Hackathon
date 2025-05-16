import { processDocsService } from './service.js';

/**
 * Controller function to handle document processing requests
 * This function acts as the interface between the HTTP request and the document processing service
 * It handles the request, calls the service, and formats the response
 * 
 * @param {Object} req - Express request object containing the request body
 * @param {Object} req.body - Request body containing PRD and images data
 * @param {string} req.body.prd - Path to the Product Requirements Document
 * @param {Array} req.body.images - Array of image paths or data
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success status and processed data
 */
export const processDocsController = async (req, res) => {
    try {
        // Step 1: Validate request body
        if (!req.body || !req.body.prd) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: PRD is required"
            });
        }

        // Step 2: Process the documents using the service
        const response = await processDocsService(req.body);
        
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
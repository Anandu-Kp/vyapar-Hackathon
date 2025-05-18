import { processDocsService } from './service.js';

export const processDocsController = async (req, res) => {
    try {
        const response = await processDocsService();

        return res.status(200).json({
            success: true,
            message: "Docs processed successfully",
            data: response
        });
    } catch (error) {
        console.error("Error in processDocsController:", error.message);
        const statusCode = error.statusCode || 500;
        
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
}
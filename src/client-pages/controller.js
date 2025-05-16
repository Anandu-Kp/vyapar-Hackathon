import express from 'express';
import { getPageHtml, getHomePageHtml } from './service.js';

const router = express.Router();

router.get('/', async (req, res) => {
    const htmlText = await getHomePageHtml();

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlText);
});

router.get('/:pageId', async (req, res) => {
    const pageId = req.params.pageId;
    const htmlText = await getPageHtml(pageId);

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlText);
});

export default router;
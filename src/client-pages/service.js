import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDB } from '../config/mongo-config.js';
import { MongoCollections } from '../constants/mongo-collections.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readHtmlCodeFromSampleTextFile = async (fileName) => {
    const myFilePath = path.join(__dirname, fileName);
    const data = await fs.readFile(myFilePath, 'utf8');
    return data;
}

const getPageHtml = async (pageId) => {
    // return await readHtmlCodeFromSampleTextFile('sample-data.txt');
    const db = await getDB();
    const page = await db.collection(MongoCollections.PAGES).aggregate([
        {
            $match: {
                pageId: pageId
            }
        },
        {
            $project: {
                _id: 0,
                htmlCode: 1
            }
        }
    ]).toArray();
    if (page.length === 0) {
        return await readHtmlCodeFromSampleTextFile('page-not-found.txt');
    }
    const htmlCode = page[0].htmlCode;
    return htmlCode;
}

export { getPageHtml };
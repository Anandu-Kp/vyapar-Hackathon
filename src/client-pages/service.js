import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const myFilePath = path.join(__dirname, 'sample-data.txt');


const readHtmlCodeFromSampleTextFile = async () => {
    const data = await fs.readFile(myFilePath, 'utf8');
    return data;
}

const getPageHtml = async (pageId) => {
    return await readHtmlCodeFromSampleTextFile();
}

export { getPageHtml };
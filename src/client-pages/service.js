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

const getComponent = async (componentId) => {
    const db = await getDB();
    const component = await db.collection(MongoCollections.PAGE_COMMENTS).aggregate([
        {
            $match: {
                componentId: componentId
            }
        },
        {
            $project: {
                _id: 0,
                htmlCode: 1
            }
        }
    ]).toArray();
    if (component.length === 0) {
        return "";
    }
    const htmlCode = component[0].htmlCode;
    return htmlCode;
}

const getHomePageHtml = async () => {
    // return await readHtmlCodeFromSampleTextFile('sample-data.txt');
    let htmlCode = await getPageHtml('home');
    if (htmlCode === undefined) {
        return await readHtmlCodeFromSampleTextFile('page-not-found.txt');
    }
    const pageLinks = await getAllPageLinkData();
    if (pageLinks.length === 0) {
        const noPagesSection = await readHtmlCodeFromSampleTextFile('no-pages.txt')
        htmlCode = htmlCode.replace(/{{pageLinks}}/g, "");
        return htmlCode.replace(/{{noPages}}/g, noPagesSection);
    }
    else{
       htmlCode = htmlCode.replace(/{{noPages}}/g, "");
    }
    const pageLinkHtml = await getComponent('page-link-from-home');
    if (pageLinkHtml === undefined) {
        return htmlCode;
    }
    let pageLinkHtmlCode = "";
    for (const pageLink of pageLinks) {
        const pageLinkHtmlCodeWithData = pageLinkHtml.replace(/{{pageId}}/g, pageLink.pageId)
            .replace(/{{title}}/g, pageLink.pageTitle)
            .replace(/{{description}}/g, pageLink.shortDescription);
        pageLinkHtmlCode += pageLinkHtmlCodeWithData;
    }
    htmlCode = htmlCode.replace(/{{pageLinks}}/g, pageLinkHtmlCode);
    return htmlCode;
}

const getAllPageLinkData = async () => {
    const db = await getDB();
    const pageLinks = await db.collection(MongoCollections.PAGES).aggregate([
        {
            $match: {
                pageId: { $ne: 'home' }
            }
        },
        {
            $project: {
                _id: 0,
                pageId: 1,
                pageTitle: 1,
                shortDescription: 1,
            }
        }
    ]).toArray();
    if (pageLinks.length === 0) {
        return [];
    }
    return pageLinks;
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

export { getPageHtml, getHomePageHtml };
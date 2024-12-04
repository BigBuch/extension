const axios = require('axios');
const FormData = require('form-data');
const { auth, appName, appVersion, serviceUrl, imageUrl, companyHandle, rootFldr, namespace, imageProdURL, videoProdURL, uploadUrl } = require('../config/config');
const xml2js = require('xml2js');
const { config } = require('nodemon');

function createHeader() {
    return `<soap:Header>
                    <authHeader xmlns="${namespace}">
                        <user>${auth.user}</user>
                        <password>${auth.password}</password>
                        <appName>${appName}</appName>
                        <appVersion>${appVersion}</appVersion>
                    </authHeader>
                </soap:Header>`;
}

function createRequest(fld, page, video) {
    const typeArray = (video === 'true') ? 'Video' : 'Image';
    const folder = fld ? fld : rootFldr;
    const header = createHeader();
    const req = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">${header}
                <soap:Body>
                    <searchAssetsParam xmlns="${namespace}">
                        <companyHandle>${companyHandle}</companyHandle>
                        <folder>${folder}</folder>
                        <includeSubfolders>false</includeSubfolders>
                        <publishState>MarkedForPublish</publishState>
                        <assetTypeArray>
                            <items>${typeArray}</items>
                        </assetTypeArray>
                        <recordsPerPage>12</recordsPerPage>
                        <resultsPage>${page}</resultsPage>
                        <sortBy>Modified</sortBy>
                        <sortDirection>Descending</sortDirection>
                    </searchAssetsParam>
                </soap:Body>
            </soap:Envelope>`;
    return req;
}


// Folders
async function searchFolders(fld) {
    let folder = fld ? fld : rootFldr;
    const header = createHeader();
    const req = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">${header}
                    <soap:Body>
                        <getFolderTreeParam xmlns="${namespace}">
                            <companyHandle>${companyHandle}</companyHandle>
                            <folderPath>${folder}</folderPath>
                            <depth>1</depth>
                        </getFolderTreeParam>
                    </soap:Body>
                </soap:Envelope>`;

    try {
        const response = await axios.post(serviceUrl, req, {
            headers: {
                'Content-Type': 'text/xml;charset=UTF-8',
                'SOAPAction': 'getFolderTree'
            }
        });
        const parser = new xml2js.Parser({ explicitArray: false });
        const parsedData = await new Promise((resolve, reject) => {
            parser.parseString(response.data, (err, result) => {
                if (err) {
                    reject('Error parsing XML:', err);
                } else {
                    resolve(result);
                }
            });
        });

        folder = folder.charAt(0) === '/' ? folder.substr(1) : folder;
        const parent = (folder !== rootFldr) ? folder.substring(0, folder.lastIndexOf("/", folder.length - 2) + 1) : folder;

        let parentFolder = { name: folder.split('/').reverse()[1], folder: parent, isParent: true };
        let parsedFolders = [parentFolder];
        const resultObject = parsedData['soapenv:Envelope']['soapenv:Body']['getFolderTreeReturn']['folders'];

        if (resultObject.hasSubfolders === 'true') {
            const folders = resultObject['subfolderArray']['items'];
            if (Array.isArray(folders)) {
                folders.forEach(fld => {
                    parsedFolders.push({
                        name: fld.path.split('/').reverse()[1],
                        folder: fld.path
                    });
                });
            } else {
                parsedFolders.push({
                    name: folders.path.split('/').reverse()[1],
                    folder: folders.path
                });
            }
        }
        return parsedFolders;
    } catch (error) {
        console.error('Error during SOAP request Folders or parsing:', error);
    }
}

// Assets
async function searchAssets(fld, page, video) {
    var page = page || 1;
    const req = createRequest(fld, page, video)

    try {
        const response = await axios.post(serviceUrl, req, {
            headers: {
                'Content-Type': 'text/xml;charset=UTF-8',
                'SOAPAction': 'searchAssets'
            }
        });

        const parser = new xml2js.Parser({ explicitArray: false });
        const parsedData = await new Promise((resolve, reject) => {
            parser.parseString(response.data, (err, result) => {
                if (err) {
                    reject('Error parsing XML:', err);
                } else {
                    resolve(result);
                }
            });
        });

        const assets = parsedData['soapenv:Envelope']['soapenv:Body']['searchAssetsReturn']['assetArray']['items'];
        const totalItems = parsedData['soapenv:Envelope']['soapenv:Body']['searchAssetsReturn']['totalRows'];

        let pages = 0;
        if (totalItems) {
            pages = parseInt(totalItems)/10;
            pages =  (pages % 10 > 0) ? Math.ceil(pages): Math.floor(pages);

        }

        if (!assets) {
            return {};
        }
        let parsedAssets = [];
        let isImage = !(video==='true');
        let prodUrl = isImage ? imageProdURL : videoProdURL ;


        if (Array.isArray(assets)) {
            parsedAssets = assets.map(asset => ({
                type: asset.type,
                name: asset.name,
                fileName: asset.fileName,
                assetProdUrl: prodUrl + asset.ipsImageUrl,
                folder: asset.folder,
                assetStgUrl: imageUrl + asset.ipsImageUrl,
                assetWidth: asset.imageInfo && isImage ? asset.imageInfo.width:'',
                assetHeight: asset.imageInfo && isImage ? asset.imageInfo.height:''

            }));
        } else {
            parsedAssets = [{
                type: assets.type,
                name: assets.name,
                fileName: assets.fileName,
                assetProdUrl: prodUrl + assets.ipsImageUrl,
                folder: assets.folder,
                fullUrl: imageUrl + assets.ipsImageUrl,
                assetStgUrl: imageUrl + assets.ipsImageUrl,
                assetWidth: assets.imageInfo && isImage ? assets.imageInfo.width:'',
                assetHeight: assets.imageInfo && isImage ? assets.imageInfo.height:''
            }];
        }

        return { assets:parsedAssets, currentPage: page, pageCount: pages };

    } catch (error) {
        console.error('Error during SOAP request Assets or parsing:', error);
        throw error;
    }
}

// Upload
async function uploadFile(fileBuffer, fileName, destFolder) {
    const folder = destFolder ? destFolder : rootFldr;
    try {
        const form = new FormData();

        form.append('auth', `
            <authHeader xmlns="http://www.scene7.com/IpsApi/xsd/2014-04-03">
                <user>${auth.user}</user>
                <password>${auth.password}</password>
                <appName>${appName}</appName>
                <appVersion>${appVersion}</appVersion>
                <gzipResponse>false</gzipResponse>
                <faultHttpStatusCode>200</faultHttpStatusCode>
            </authHeader>
        `, { contentType: 'text/plain; charset=US-ASCII' });


        form.append('uploadParams', `
            <uploadPostParam xmlns="http://www.scene7.com/IpsApi/xsd/2014-04-03">
                <companyHandle>${companyHandle}</companyHandle>
                <jobName>uploadJob-${Date.now()}</jobName>
                <destFolder>${folder}</destFolder>
                <fileName>${fileName}</fileName>
                <endJob>true</endJob>
                <uploadParams>
                    <overwrite>true</overwrite>
                    <readyForPublish>true</readyForPublish>
                    <preservePublishState>true</preservePublishState>
                    <createMask>false</createMask>
                    <emailSetting>None</emailSetting>
                </uploadParams>
            </uploadPostParam>
        `, { contentType: 'text/plain; charset=US-ASCII' });


        form.append('file', fileBuffer, {
            filename: fileName,
            contentType: 'application/octet-stream',
            transferEncoding: 'binary'
        });


        const response = await axios.post(uploadUrl, form, {
            headers: {
                ...form.getHeaders(),
                'User-Agent': 'YourAppName/1.0',
            },
        });

        console.log('Upload successful:', response.data);
        return {upload:"success", fileName: fileName, destFolder: destFolder};
    } catch (error) {
        console.error('Error uploading file:', error.message);
        throw error;
    }
}
// search by keyword
function buildGetSearchAssetsParamXML(folderPath, recordsPerPage = 12, resultsPage, includeSubfolders, keyword, typeArray) {
    let actionPayload = `
        <searchAssetsParam xmlns="${namespace}">
            <companyHandle>${companyHandle}</companyHandle>`;

    if (folderPath) {
        actionPayload += `
            <folder>${folderPath}</folder>`;
    }

    actionPayload += `
            <includeSubfolders>${includeSubfolders}</includeSubfolders>
            <publishState>MarkedForPublish</publishState>`;

    if (keyword) {
        actionPayload += `
            <conditionMatchMode>MatchAny</conditionMatchMode>
            <systemFieldConditionArray>
                <items>
                    <field>Name</field>
                    <op>Contains</op>
                    <value>${keyword}</value>
                </items>
            </systemFieldConditionArray>`;
    }

    actionPayload += `
            <assetTypeArray>
                <items>${typeArray}</items>
            </assetTypeArray>`;

    if (recordsPerPage && resultsPage) {
        actionPayload += `
            <recordsPerPage>${recordsPerPage}</recordsPerPage>
            <resultsPage>${resultsPage}</resultsPage>`;
    }

    actionPayload += `
            <sortBy>Modified</sortBy>
            <sortDirection>Descending</sortDirection>
        </searchAssetsParam>`;

    return actionPayload;
}

async function searchByKeyword(keyword, folderPath = rootFldr, page = 1, recordsPerPage = 12, video = false) {
    const typeArray = (video === 'true') ? 'Video' : 'Image';
    const includeSubfolders = true;
    const header = createHeader()
    const requestXML = `
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
            ${header}
            <soap:Body>
                ${buildGetSearchAssetsParamXML(folderPath, recordsPerPage, page, includeSubfolders, keyword, typeArray)}
            </soap:Body>
        </soap:Envelope>`;


        try {
            const response = await axios.post(serviceUrl, requestXML, {
            headers: {
                'Content-Type': 'text/xml;charset=UTF-8',
                'SOAPAction': 'searchAssets'
            }
        });


        const parser = new xml2js.Parser({ explicitArray: false });
        const parsedData = await new Promise((resolve, reject) => {
            parser.parseString(response.data, (err, result) => {
                if (err) {
                    reject('Error parsing XML:', err);
                } else {
                    resolve(result);
                }
            });
        });

        const searchResult = parsedData['soapenv:Envelope']['soapenv:Body']['searchAssetsReturn'];

        if (!searchResult['assetArray']) {
            return {};
        }
        const assets = searchResult['assetArray']['items'];
        const totalItems = searchResult['totalRows'];
        const pageCount = Math.ceil(totalItems / recordsPerPage);
        let isImage = !(video==='true');
        let prodUrl =isImage ? imageProdURL : videoProdURL;

        console.log(prodUrl);

        const parsedAssets = Array.isArray(assets) ? assets.map(asset => ({
            type: asset.type,
            name: asset.name,
            fileName: asset.fileName,
            assetProdUrl: prodUrl + asset.ipsImageUrl,
            folder: asset.folder,
            assetStgUrl: imageUrl + asset.ipsImageUrl,
            assetWidth: asset.imageInfo && isImage ? asset.imageInfo.width:'',
            assetHeight: asset.imageInfo && isImage ? asset.imageInfo.height:''
        })) : [{
            type: assets.type,
            name: assets.name,
            fileName: assets.fileName,
            assetProdUrl: prodUrl + assets.ipsImageUrl,
            folder: assets.folder,
            fullUrl: imageUrl + assets.ipsImageUrl,
            assetStgUrl: imageUrl + assets.ipsImageUrl,
            assetWidth: assets.imageInfo && isImage ? assets.imageInfo.width:'',
            assetHeight: assets.imageInfo && isImage ? assets.imageInfo.height:''
        }];


        return { assets: parsedAssets, currentPage: page, pageCount };
    } catch (error) {
        console.error('Error during SOAP request by keyword or parsing:', error.message);
        throw error;
    }
}

module.exports = {
    searchAssets,
    searchFolders,
    uploadFile,
    searchByKeyword
};

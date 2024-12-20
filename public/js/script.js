const imagesContainer = document.getElementById('images');
const popup = document.getElementById('popup');
const loader = document.getElementById('loader');
const folderStructure = document.getElementById('folderStructure');
const uploadBtn = document.getElementById('uploadBtn');
const currentPageElement = document.getElementById('currentPage');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const searchPanel = document.getElementById('searchPanel');
const searchPopup = document.getElementById('searchPopup');
const searchFld = document.getElementById('searchFld');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');
const searchTxt = document.getElementById('searchTxt');
const formatSelector = document.getElementById('formatSelector');
const mediaType = document.getElementById('mediaType');
const mediaName = document.getElementById('mediaName');
const deleteImageBtn = document.getElementById('deleteImageBtn');
const cancelBtn = document.getElementById('cancelBtn');
const openPopupBtn = document.getElementById('openPopupBtn');
const imageContainer = document.getElementById('imageContainer');
const uploadPopup = document.getElementById('uploadPopup');
const closeUploadPopupBtn = document.getElementById('closeUploadPopupBtn');
const uploadForm = document.getElementById('uploadForm');

let video;
let mediaTypeName;

class Extension {
    constructor(sdk) {
        this.sdk = sdk;
        this.init();
    }
    init = () => {
        this.setupEventListeners();
        if (this.sdk.params) {
            video = this.sdk.params.instance.video ? this.sdk.params.instance.video: false;
            mediaTypeName = video ? 'Video' : 'Image'
            mediaType.innerHTML = mediaTypeName;
            openPopupBtn.innerHTML = video ? 'Open Video picker' : 'Open Image picker';
        }
        this.loadCurrentValue();
        this.sdk.frame.setHeight(110);
    }

    setupEventListeners = () => {
        openPopupBtn.addEventListener('click', this.openPopup);
        cancelBtn.addEventListener('click', this.closePopup);
        deleteImageBtn.addEventListener('click', this.deleteValue);

        imagesContainer.addEventListener('click', async (event) => {
            if (event.target.closest('.image-item_hover')) {
                const imageWrapper = event.target.closest('.image-item').querySelector('.image-option');
                let imageObject =  await createImageObject(imageWrapper.dataset);
                this.selectImage(imageObject);
            }
        });
        folderStructure.addEventListener('click', (event) => {
            if (event.target.classList.contains('folder')) {
                const folderID = event.target.id;
                this.fillPopup(folderID);
            }
        });
    }

    fillPopup = async (folderID) => {
        loader.style.display = 'block';
        await Promise.all([fetchAssets(folderID), fetchFolders(folderID)]);
        loader.style.display = 'none';

    }
    openPopup = async () => {
        imagesContainer.innerHTML = '';
        popup.style.display = 'block';
        folderStructure.style.display = 'block';
        this.sdk.frame.setHeight(696)
        await this.fillPopup();
    }

    closePopup = () => {
        document.getElementById('popup').style.display = 'none';
        folderStructure.style.display = 'none';
        this.sdk.frame.setHeight(110)
    }

    setValue = async (value) => {
        await this.sdk.field.setValue(value);
    }

    deleteValue = async () => {
        await this.sdk.field.setValue({
            "images": [],
            "preview_src":"",
            "defaultProd_src":""
        });
        imageContainer.innerHTML = '';
        mediaName.innerHTML = ""
    }
    selectImage = async (src) => {
        if (src.preview_src) {
            try {
                const img = document.createElement('img');
                img.src = src.preview_src;
                img.id = 'selectedImage';
                imageContainer.innerHTML = '';
                imageContainer.appendChild(img);


                this.setValue(src);

                let srcValue = src.preview_src;
                let name = srcValue.split('/').pop();

                if(name) {
                    mediaName.innerHTML = `
                        <div class="b-image-property_label">${mediaTypeName}</div>
                        <div class="b-image-property_value">${name}</div>
                    `;
                }
                    this.closePopup();
                } catch (error) {
                console.error('Error selecting image:', error);
                //alert('Error selecting image');
            }
        }
    }

    loadCurrentValue = async () => {
        try {
            const value = await this.sdk.field.getValue();
            if (value) {
                this.selectImage(value);
            }
        } catch (error) {
            console.error('Error loading current value:', error);
        }
    }
}

/*  start search block    */
async function fetchFolders(folderID) {
    const qstring = folderID ? `?folderID=/${encodeURIComponent(folderID)}`:'';
    try {
        const response = await fetch(`/search-folders${qstring}`);
        const folders = await response.json();

        const ul = document.createElement('ul');
        ul.classList.add('folder-list');
        const folderIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z"/></svg>
        `;
        const openedFolderIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640H447l-80-80H160v480l96-320h684L837-217q-8 26-29.5 41.5T760-160H160Zm84-80h516l72-240H316l-72 240Zm0 0 72-240-72 240Zm-84-400v-80 80Z"/></svg>`

        folders.forEach(folder => {
            const folderItem = document.createElement('li');
            folderItem.classList.add('folder');
            if (folder.isParent) {
                folderItem.innerHTML = openedFolderIcon + (folder.name ? folder.name : 'No Name');
                folderItem.classList.add('parent-folder');
            } else {
                folderItem.innerHTML = folderIcon + (folder.name ? folder.name : 'No Name');
            }
            folderItem.setAttribute('id', `${folder.folder}`);
            folderItem.dataset.folderId = folder.folder;

            ul.appendChild(folderItem);
        });

        folderStructure.innerHTML = '';
        folderStructure.appendChild(ul);
    } catch (error) {
        console.error('Error fetching folders:', error);
    }
}

async function fetchAssets(folderID = '', page = 1) {
    loader.style.display = 'block';
    try {
        const qstring = folderID ? `?video=${video}&folderID=${folderID}&page=${page}` : `?video=${video}&page=${page}`;

        const response = await fetch(`/search-assets${qstring}`);
        const { assets, currentPage, pageCount } = await response.json();
        renderImages(assets, currentPage, pageCount);
    } catch (error) {
        console.error('Error fetching assets:', error);
        imagesContainer.innerHTML = `<p>Error loading assets.</p>`;
    } finally {
        loader.style.display = 'none';
    }
    prevBtn.dataset.function = 'fetchAssets';
    prevBtn.dataset.folder = folderID;
    nextBtn.dataset.function = 'fetchAssets';
    nextBtn.dataset.folder = folderID;
}


async function searchByText({ keyword, folderPath = '', page = 1 }) {
    loader.style.display = 'block';
    try {
        const queryParams = new URLSearchParams({ keyword, folderPath, page, video }).toString();
        const response = await fetch(`/search-by-text?${queryParams}`);
        if (!response || !response.ok) {
            throw new Error('Failed to fetch search results');
        }

        const data = await response.json();
        if (!data) {
            throw new Error('No data received from server');
        }
        const { assets = [], currentPage = 1, pageCount = 1 } = data;

        renderImages(assets, currentPage, pageCount);
    } catch (error) {
        console.error('Error during search by text:', error);
        imagesContainer.innerHTML = `<p>Error: ${error.message}</p>`;
    } finally {
        loader.style.display = 'none';
    }
    prevBtn.dataset.function = 'searchByText';
    nextBtn.dataset.function = 'searchByText';
}

/*  start listeners block    */

uploadBtn.addEventListener('click', () => {
    uploadPopup.style.display = 'block';
});

closeUploadPopupBtn.addEventListener('click', () => {
    uploadPopup.style.display = 'none';
});

uploadForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(uploadForm);
    const selectedFile = formData.get('imageFile');
    const fileName = formData.get('imageTitle') || selectedFile.name;
    const destFolder = nextBtn.dataset.folder || '';

    if (!selectedFile) {
        alert('Please select a file to upload');
        return;
    }

    formData.append('file', selectedFile);
    formData.append('fileName', fileName);
    formData.append('destFolder', destFolder);

    try {
        const response = await fetch('/upload-file', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Upload successful:', result);

        alert('Image uploaded successfully!');
        uploadPopup.style.display = 'none';
        uploadForm.reset();
    } catch (error) {
        console.error('Error uploading file:', error);
        alert('Failed to upload the image. Please try again.');
    }
});

// Paginator
prevBtn.addEventListener('click', () => {
    const currentFunction = prevBtn.dataset.function;
    const currentPage = Number(prevBtn.dataset.page);
    const folder = prevBtn.dataset.folder || '';
    const keyword = searchInput.value.trim();

    if (currentFunction === 'fetchAssets') {
        fetchAssets(folder, currentPage);
    } else if (currentFunction === 'searchByText') {
        searchByText({ keyword, page: currentPage });
    }
});

nextBtn.addEventListener('click', () => {
    const currentFunction = nextBtn.dataset.function;
    const currentPage = Number(nextBtn.dataset.page);
    const folder = nextBtn.dataset.folder || '';
    const keyword = searchInput.value.trim();

    if (currentFunction === 'fetchAssets') {
        fetchAssets(folder, currentPage);
    } else if (currentFunction === 'searchByText') {
        searchByText({ keyword, page: currentPage });
    }
});

function showSearchPanel() {
    folderStructure.style.display = 'none';
    searchPanel.style.display = 'block';
    searchFld.classList.remove('active');
    searchTxt.classList.add('active');
    searchInput.value = '';
    disableUpload();
}

function showFolderPanel() {
    searchPanel.style.display = 'none';
    folderStructure.style.display = 'block';
    searchFld.classList.add('active');
    searchTxt.classList.remove('active');
    enableUpload();
}

document.getElementById('cancelBtn').addEventListener('click', showFolderPanel);
searchTxt.addEventListener('click', showSearchPanel);

searchBtn.addEventListener('click', () => {
    const keyword = searchInput.value.trim();
    if (keyword) {
        searchByText({ keyword, page: 1 });
        prevBtn.dataset.function = 'searchByText';
        nextBtn.dataset.function = 'searchByText';
    } else {
        alert('Please enter a keyword for search.');
    }
});

// rendering
function renderImages(assets, currentPage, totalPages) {
    imagesContainer.innerHTML = '';
    if (!assets || assets.length === 0) {
        imagesContainer.innerHTML = '<div class="serach-no-result">No results found.</div>';
        return;
    }

    assets.forEach((item) => {
        const imgElement = document.createElement('img');
        imgElement.src = item.assetStgUrl;
        imgElement.className = 'image-option';

        imgElement.dataset.prodUrl = item.assetProdUrl;
        imgElement.dataset.stgUrl = item.assetStgUrl;
        imgElement.dataset.width = item.assetWidth;
        imgElement.dataset.height = item.assetHeight;
        imgElement.dataset.fileName = item.name;

        imgElement.setAttribute('data-src', item.assetStgUrl);

        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'image-wrapper';
        imgWrapper.appendChild(imgElement);

        const imgItem = document.createElement('div');
        imgItem.className = 'image-item';
        imgItem.innerHTML = `<div class="image-name">${item.name}</div>`;

        const imgItemHover = document.createElement('div');
        imgItemHover.className = 'image-item_hover';
        imgItemHover.innerHTML = `
            <div class="image-item_hover_icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 51.4 51.4" fill="none" fit="" height="100%" width="100%" preserveAspectRatio="xMidYMid meet" focusable="false">
                    <circle class="circle" r="22.7" cx="25.7" cy="25.7" stroke-width="2" stroke="currentColor"></circle>
                    <path class="plus" d="M26.7,24.7h9.5 v2h-9.5v9.5h-2v-9.5h-9.5v-2h9.5v-9.5h2V24.7z" fill="currentColor"></path>
                </svg>
            </div>
        `;
        imgItem.appendChild(imgWrapper);

        imagesContainer.appendChild(imgItem).appendChild(imgItemHover);
    });

    currentPageElement.innerText = `${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
    prevBtn.dataset.page = +currentPage - 1;
    nextBtn.dataset.page = +currentPage + 1;
}

function disableUpload() {
    uploadBtn.disabled = true;
    uploadBtn.classList.add('disabled');
}

function enableUpload() {
    uploadBtn.disabled = false;
    uploadBtn.classList.remove('disabled');
}

searchFld.addEventListener('click', showFolderPanel);

async function createImageObject(data) {
    let fileName = data.fileName;
    let nameArray = fileName.split('_');
    let size = nameArray.pop();
    let modifiers =[];
    let sazesArray = ['SM', 'MD', 'LG', 'XL'];

    if ((sazesArray.indexOf(size)!==-1)&&video==false) {

        let queryText = nameArray.join('_');
        // avoiding searchin all assets
        if (queryText.length > 0) {
            const response = await fetch(`/search-by-text?keyword=${queryText}`);

            if (!response || !response.ok) {
                throw new Error('Failed to fetch search results');
            }

            const resp = await response.json();
            if (!resp) {
                throw new Error('No data received from server');
            }

            const { assets = [] } = resp;


            assets.forEach(asset => {
                let nameArray = asset.assetProdUrl.split('_');
                let size = nameArray.pop();

                if (sazesArray.indexOf(size)!==-1) {
                    let sizeData = {
                        prodsrc: asset.assetProdUrl,
                        stgsrc: asset.assetStgUrl,
                        width: asset.assetWidth,
                        height: asset.assetHeight,
                    }

                    modifiers.push(sizeData);
                }
            });
        }
    }

    return {
        "images": modifiers,
        "preview_src": data.stgUrl,
        "defaultProd_src": data.prodUrl,
        "default_width": data.width||'',
        "default_height": data.height||'',
    };
}


(async function  () {
	try {
      new Extension(await dcExtensionsSdk.init())
    } catch (e) {
      document.body.innerHTML = 'Failed to connect'
    }
})()

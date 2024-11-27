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
const toggleButton = document.getElementById('toggleButton');
const formatSelector = document.getElementById('formatSelector');
let video = false;
class Extension {
    constructor(sdk) {
        this.sdk = sdk;
        this.init();
    }

    init = () => {
        this.setupEventListeners();
        this.loadCurrentValue();
    }

    setupEventListeners = () => {
        document.getElementById('openPopupBtn').addEventListener('click', this.openPopup);
        document.getElementById('cancelBtn').addEventListener('click', this.closePopup);
        imagesContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('image-option')) {
                const imgSrc = event.target.dataset.src;
                const prodSrc = event.target.dataset.prodUrl;
                this.selectImage(imgSrc, prodSrc);
            }
        });
        folderStructure.addEventListener('click', (event) => {
            if (event.target.classList.contains('folder')) {
                const folderID = event.target.id;
                //console.log(folderID);
                this.fillPopup(folderID);
            }
        });
        formatSelector.addEventListener('change', (event) => {
            let selectedFormat = event.target.value;
            console.log('Selected format:', selectedFormat);

            let url = document.getElementById("selectedImage").src;
            let urlObj = new URL(url);
            urlObj.search = '';
            urlObj.searchParams.set('fmt', selectedFormat);
            let newUrl = urlObj.toString();
            this.setValue(newUrl);
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
        await this.fillPopup();
        this.sdk.frame.setHeight(600)
    }
    closePopup = () => {
        document.getElementById('popup').style.display = 'none';
        folderStructure.style.display = 'none';
    }

    setValue = async (value) => {
        await this.sdk.field.setValue(value);
    }
    selectImage = async (src, prodSrc) => {
        try {
            const img = document.createElement('img');
            img.src = src;
            let prodValue = prodSrc ? prodSrc : src;
            img.id = 'selectedImage';
            const container = document.getElementById('imageContainer');
            container.innerHTML = '';
            container.appendChild(img);

            fetch(prodValue).then(response => {
                let headers = response.headers.get('Content-Type')
                console.log(response.headers.get('Content-Type'));
                if (headers==  'video/mp4') {
                    formatSelector.style.display = 'none';
                    img.src = prodValue.replace('content', 'image');
                } else {
                    formatSelector.style.display = 'block';
                    const urlObj = new URL(prodValue);

                    let fmt = urlObj.searchParams.get("fmt");

                    console.log(prodValue, fmt, urlObj);

                    if  (fmt) {
                        console.log(fmt);
                        let neededRadio = document.querySelector(`input[name="format"][value="${fmt}"]`);
                        neededRadio.checked = true;
                    } else {
                        let defaultValue = document.querySelector('input[name="format"][value="pjpeg"]');
                        defaultValue.checked = true;
                    }
                    let selectedRadio = document.querySelector('input[name="format"]:checked');
                    urlObj.searchParams.set('fmt', selectedRadio.value);
                    prodValue = urlObj.toString();
                }
            });

            this.setValue(prodValue);
            this.closePopup();
            this.sdk.frame.setHeight(300)

        } catch (error) {
            console.error('Error selecting image:', error);
            alert('Error selecting image');
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
async function fetchFolders(folderID) {
    const qstring = folderID ? `?folderID=/${encodeURIComponent(folderID)}`:'';
    try {
        const response = await fetch(`/search-folders${qstring}`);
        const folders = await response.json();
       // console.log('Fetched folders:', folders);
        const ul = document.createElement('ul');
        ul.classList.add('folder-list');
        const folderIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="16" height="16" viewBox="0 0 48 48">
            <path fill="#ffa000" d="M40,12H22l-4-4H8c-2.2,0-4,1.8-4,4v24c0,2.2,1.8,4,4,4h29.7L44,29V16C44,13.8,42.2,12,40,12z"></path>
            <path fill="#ffca28" d="M40,12H8c-2.2,0-4,1.8-4,4v20c0,2.2,1.8,4,4,4h32c2.2,0,4-1.8,4-4V16C44,13.8,42.2,12,40,12z"></path>
        </svg>
        `;
        const openedFolderIcon = `<svg xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 48 48" width="20px" height="20px"><linearGradient id="xGIh33lbYX9pWIYWeZsuka" x1="24" x2="24" y1="6.955" y2="23.167" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#eba600"/><stop offset="1" stop-color="#c28200"/></linearGradient><path fill="url(#xGIh33lbYX9pWIYWeZsuka)" d="M24.414,10.414l-2.536-2.536C21.316,7.316,20.553,7,19.757,7H5C3.895,7,3,7.895,3,9v30	c0,1.105,0.895,2,2,2h38c1.105,0,2-0.895,2-2V13c0-1.105-0.895-2-2-2H25.828C25.298,11,24.789,10.789,24.414,10.414z"/><linearGradient id="xGIh33lbYX9pWIYWeZsukb" x1="24.066" x2="24.066" y1="19.228" y2="33.821" gradientTransform="matrix(-1 0 0 1 48 0)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffd869"/><stop offset="1" stop-color="#fec52b"/></linearGradient><path fill="url(#xGIh33lbYX9pWIYWeZsukb)" d="M24,23l3.854-3.854C27.947,19.053,28.074,19,28.207,19H44.81c1.176,0,2.098,1.01,1.992,2.181	l-1.636,18C45.072,40.211,44.208,41,43.174,41H4.79c-1.019,0-1.875-0.766-1.988-1.779L1.062,23.555C1.029,23.259,1.261,23,1.559,23	H24z"/></svg>`

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
    toggleButton.dataset.function = 'fetchAssets';
    toggleButton.dataset.folder = folderID;
}

(async function  () {
	try {
      new Extension(await dcExtensionsSdk.init())
    } catch (e) {
      document.body.innerHTML = 'Failed to connect'
    }
})()

// Upload
const uploadPopup = document.getElementById('uploadPopup');
const closeUploadPopupBtn = document.getElementById('closeUploadPopupBtn');
const uploadForm = document.getElementById('uploadForm');

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
    const destFolder = toggleButton.dataset.folder || '';

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
    searchInput.value = '';
    disableUpload();
}

function showFolderPanel() {
    searchPanel.style.display = 'none';
    folderStructure.style.display = 'block';
    enableUpload();
}

document.getElementById('cancelBtn').addEventListener('click', showFolderPanel);

searchTxt.addEventListener('click', showSearchPanel);


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
    toggleButton.dataset.function = 'searchByText';
}


searchBtn.addEventListener('click', () => {
    const keyword = searchInput.value.trim();
    if (keyword) {
        searchByText({ keyword, page: 1 });
        prevBtn.dataset.function = 'searchByText';
        nextBtn.dataset.function = 'searchByText';
        toggleButton.dataset.function = 'searchByText';
    } else {
        alert('Please enter a keyword for search.');
    }
});

// reusing rendering
function renderImages(assets, currentPage, totalPages) {
    imagesContainer.innerHTML = '';
    if (!assets || assets.length === 0) {
        imagesContainer.innerHTML = '<div class="serach-no-result">No results found.</div>';
        return;
    }

    assets.forEach((item) => {
        const imgElement = document.createElement('img');
        imgElement.src = item.fullUrl;
        imgElement.className = 'image-option';
        imgElement.dataset.prodUrl = item.assetProdUrl;
        imgElement.setAttribute('data-src', item.fullUrl);

        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'image-wrapper';
        imgWrapper.appendChild(imgElement);

        const imgItem = document.createElement('div');
        imgItem.className = 'image-item';
        imgItem.innerHTML = `<div class="image-name">${item.name}</div>`;

        imagesContainer.appendChild(imgItem).appendChild(imgWrapper);
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

toggleButton.addEventListener('click', () => {
    if (toggleButton.textContent === 'Switch to Video') {
        toggleButton.textContent = 'Switch to Image';
        video = true;

    } else {
        toggleButton.textContent = 'Switch to Video';
        video = false;
    }

    const currentFunction = toggleButton.dataset.function;
    const folder = toggleButton.dataset.folder || '';
    const keyword = searchInput.value.trim();

    if (currentFunction === 'fetchAssets') {
        fetchAssets(folder);
    } else if (currentFunction === 'searchByText') {
        searchByText({ keyword });
    }
});
